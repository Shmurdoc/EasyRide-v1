<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\RideStatus;
use App\Models\DriverViolation;
use App\Models\PoolPassenger;
use App\Models\Ride;
use App\Models\RideLocationLog;
use App\Models\RideStatusHistory;
use App\Models\User;
use App\Services\SurgePricingService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class RideService
{
    private const float MAX_LOCATION_JUMP_KM = 5.0;

    private const int GPS_SPOOF_THRESHOLD_SECONDS = 300;

    private const float NIGHT_SURGE_MULTIPLIER = 1.5;

    private const int CONCURRENT_RIDE_LOCK_TTL_SECONDS = 10;

    private const float FARE_DEVIATION_THRESHOLD = 0.20;

    private const float MAX_REALISTIC_SPEED_KMH = 180.0;

    private const float MIN_REALISTIC_SPEED_KMH = 0.5;

    private const int MIN_LOCATION_POINTS_FOR_FARE = 3;

    private ?DriverViolation $lastFraudViolation = null;

    public function __construct(
        protected FareCalculationService $fareCalculationService,
        protected SurgePricingService $surgePricingService,
        protected RideMatchingService $rideMatchingService,
        protected RatingService $ratingService,
        protected RouteService $routeService,
        protected RideStateService $rideStateService,
        protected SocketService $socketService,
        protected DriverFraudGuardService $fraudGuardService,
        protected FleetModeService $fleetModeService,
    ) {}

    public function lastFraudViolation(): ?DriverViolation
    {
        return $this->lastFraudViolation;
    }

    public function createRide(User $rider, array $data): Ride
    {
        $lockKey = "ride_create_lock:{$rider->id}";

        if (Cache::has($lockKey)) {
            throw new RuntimeException('A ride request is already being processed. Please wait.');
        }

        Cache::put($lockKey, true, self::CONCURRENT_RIDE_LOCK_TTL_SECONDS);

        try {
            $this->validateRiderCanRequestRide($rider);

            $pickupLat = (float) $data['pickup_lat'];
            $pickupLng = (float) $data['pickup_lng'];
            $dropoffLat = (float) $data['dropoff_lat'];
            $dropoffLng = (float) $data['dropoff_lng'];

            $fare = $this->fareCalculationService->calculate(
                $pickupLat,
                $pickupLng,
                $dropoffLat,
                $dropoffLng,
                $data['category'],
                tenantId: $rider->tenant_id,
            );

            $surgeMultiplier = $this->getNightSurgeMultiplier(
                $pickupLat,
                $pickupLng,
                $data['category'],
                $rider->tenant_id,
            );

            if ($surgeMultiplier > 1.0) {
                $fare['surge_multiplier'] = $surgeMultiplier;
                $fare['total_fare'] = round($fare['total_fare'] * $surgeMultiplier, 2);
            }

            $ride = Ride::create([
                'tenant_id' => $rider->tenant_id,
                'rider_id' => $rider->id,
                'pickup_latitude' => $pickupLat,
                'pickup_longitude' => $pickupLng,
                'dropoff_latitude' => $dropoffLat,
                'dropoff_longitude' => $dropoffLng,
                'pickup_address' => $data['pickup_address'],
                'dropoff_address' => $data['dropoff_address'],
                'status' => RideStatus::SEARCHING->value,
                'category' => $data['category'],
                'distance_km' => $fare['distance_km'],
                'duration_minutes' => $fare['duration_minutes'],
                'base_fare' => $fare['base_fare'],
                'per_km_fare' => $fare['per_km_fare'],
                'surge_multiplier' => $surgeMultiplier,
                'total_fare' => $fare['total_fare'],
                'payment_method' => $data['payment_method'],
                'search_radius_km' => 5.0,
                'route_polyline' => null,
                'estimated_fare_at_booking' => $fare['total_fare'],
                'status_history' => [
                    ['status' => RideStatus::SEARCHING->value, 'at' => now()->toISOString()],
                ],
            ]);

            Log::info('Ride created', [
                'ride_id' => $ride->id,
                'rider_id' => $rider->id,
                'category' => $data['category'],
                'total_fare' => $ride->total_fare,
                'surge' => $surgeMultiplier,
            ]);

            $this->socketService::broadcastToAllDrivers('ride:request', [
                'rideId' => $ride->id,
                'riderId' => $rider->id,
                'category' => $ride->category,
                'price' => (float) $ride->total_fare,
                'distance' => $ride->distance_km,
                'duration' => $ride->duration_minutes,
                'pickupAddress' => $ride->pickup_address,
                'destAddress' => $ride->dropoff_address,
                'riderName' => $rider->name,
                'timestamp' => now()->toISOString(),
                'pickup_lat' => $ride->pickup_latitude,
                'pickup_lng' => $ride->pickup_longitude,
                'dropoff_lat' => $ride->dropoff_latitude,
                'dropoff_lng' => $ride->dropoff_longitude,
            ]);

            return $ride;
        } catch (\Throwable $e) {
            Log::error('Failed to create ride', [
                'rider_id' => $rider->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        } finally {
            Cache::forget($lockKey);
        }
    }

    public function findNearbyDrivers(float $lat, float $lng, float $radiusKm = 10.0, ?string $tenantId = null): Collection
    {
        $earthRadius = 6371.0;
        $deltaLat = $radiusKm / $earthRadius * (180 / M_PI);
        $deltaLng = $radiusKm / ($earthRadius * cos(deg2rad($lat))) * (180 / M_PI);

        return User::query()
            ->where('role', 'driver')
            ->where('is_online', true)
            ->where('is_active', true)
            ->whereNull('current_ride_id')
            ->whereHas('driverProfile', fn ($q) => $q->where('is_approved', true))
            ->whereHas('vehicle', fn ($q) => $q->where('is_active', true))
            ->whereBetween('current_latitude', [$lat - $deltaLat, $lat + $deltaLat])
            ->whereBetween('current_longitude', [$lng - $deltaLng, $lng + $deltaLng])
            ->select('users.*')
            ->selectRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) * cos(radians(current_longitude) - radians(?)) + sin(radians(?)) * sin(radians(current_latitude)))) AS distance',
                [$lat, $lng, $lat]
            )
            ->orderBy('distance')
            ->get()
            ->filter(fn (User $driver) => ($driver->distance ?? PHP_FLOAT_MAX) <= $radiusKm)
            ->filter(fn (User $driver) => $this->fleetModeService->allows(
                $driver,
                FleetModeService::VERTICAL_RIDES,
                $tenantId ?? $driver->tenant_id,
            ))
            ->values();
    }

    public function findNearbyRides(float $lat, float $lng, float $radiusKm = 10.0, ?string $tenantId = null, ?User $driver = null): Collection
    {
        $earthRadius = 6371.0;
        $deltaLat = $radiusKm / $earthRadius * (180 / M_PI);
        $deltaLng = $radiusKm / ($earthRadius * cos(deg2rad($lat))) * (180 / M_PI);

        $query = Ride::query()
            ->where('status', RideStatus::REQUESTED)
            ->whereBetween('pickup_latitude', [$lat - $deltaLat, $lat + $deltaLat])
            ->whereBetween('pickup_longitude', [$lng - $deltaLng, $lng + $deltaLng]);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        return $query->select('rides.*')
            ->selectRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(pickup_latitude)) * cos(radians(pickup_longitude) - radians(?)) + sin(radians(?)) * sin(radians(pickup_latitude)))) AS distance',
                [$lat, $lng, $lat]
            )
            ->orderBy('distance')
            ->get()
            ->filter(fn (Ride $ride) => ($ride->distance ?? PHP_FLOAT_MAX) <= $radiusKm)
            ->filter(fn (Ride $ride) => $driver === null || $this->fleetModeService->allows(
                $driver,
                FleetModeService::VERTICAL_RIDES,
                $ride->tenant_id,
            ))
            ->values();
    }

    public function acceptRide(Ride $ride, User $driver): Ride
    {
        return DB::transaction(function () use ($ride, $driver) {
            $lockedRide = Ride::where('id', $ride->id)
                ->where('status', RideStatus::SEARCHING->value)
                ->lockForUpdate()
                ->first();

            if (! $lockedRide) {
                throw new RuntimeException('Ride is no longer available or has been claimed by another driver.');
            }

            if ($driver->current_ride_id !== null) {
                throw new RuntimeException('You already have an active ride.');
            }

            if (! $driver->is_online) {
                throw new RuntimeException('You must be online to accept rides.');
            }

            $driverProfile = $driver->driverProfile;
            if ($driverProfile && ! $driverProfile->is_approved) {
                throw new RuntimeException('Your driver profile has not been approved.');
            }

            if ($this->fraudGuardService->isBlockedFromAccepting($driver)) {
                throw new RuntimeException('You have unpaid conduct fines. Settle them to accept rides.');
            }

            if (! $this->fleetModeService->allows(
                $driver,
                FleetModeService::VERTICAL_RIDES,
                $lockedRide->tenant_id,
            )) {
                throw new RuntimeException('This ride is not available in your fleet pool.');
            }

            $pickupLat = (float) $lockedRide->pickup_latitude;
            $pickupLng = (float) $lockedRide->pickup_longitude;
            $driverLat = (float) $driver->current_latitude;
            $driverLng = (float) $driver->current_longitude;

            $this->validateDriverLocation($driverLat, $driverLng);

            $distanceToPickup = $this->rideMatchingService->calculateDistance(
                $pickupLat,
                $pickupLng,
                $driverLat,
                $driverLng,
            );

            $etaSeconds = $this->rideMatchingService->calculateETA(
                $driverLat,
                $driverLng,
                $pickupLat,
                $pickupLng,
            );

            $lockedRide->update([
                'driver_id' => $driver->id,
                'status' => RideStatus::ACCEPTED->value,
                'driver_eta' => $etaSeconds,
                'driver_notified_at' => now(),
                'status_history' => array_merge(
                    $lockedRide->status_history ?? [],
                    [['status' => RideStatus::ACCEPTED->value, 'at' => now()->toISOString(), 'driver_id' => $driver->id]]
                ),
            ]);

            RideStatusHistory::create([
                'ride_id' => $lockedRide->id,
                'from_status' => RideStatus::SEARCHING->value,
                'to_status' => RideStatus::ACCEPTED->value,
                'actor_id' => $driver->id,
            ]);

            $driver->update(['current_ride_id' => $lockedRide->id]);

            Log::info('Ride accepted by driver', [
                'ride_id' => $lockedRide->id,
                'driver_id' => $driver->id,
                'distance_to_pickup_km' => round($distanceToPickup, 2),
                'eta_seconds' => $etaSeconds,
            ]);

            $this->socketService::broadcastToRide($lockedRide->id, 'ride:accepted', [
                'rideId' => $lockedRide->id,
                'status' => RideStatus::ACCEPTED->value,
                'driverId' => $driver->id,
                'driverName' => $driver->name,
                'driver_lat' => $driverLat,
                'driver_lng' => $driverLng,
                'eta_seconds' => $etaSeconds,
                'distance_to_pickup_km' => round($distanceToPickup, 2),
                'vehicle_make' => $driver->vehicle?->make,
                'vehicle_model' => $driver->vehicle?->model,
                'vehicle_color' => $driver->vehicle?->color,
                'vehicle_plate' => $driver->vehicle?->plate_number,
            ]);

            return $lockedRide->fresh();
        });
    }

    public function startRide(Ride $ride): Ride
    {
        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if (! in_array($currentStatus, [
            RideStatus::ARRIVED->value,
            RideStatus::WAITING_FOR_RIDER->value,
        ])) {
            throw new RuntimeException(
                'Ride cannot be started from status: ' . $currentStatus . '. Driver must arrive first.'
            );
        }

        if (! $ride->transitionTo(RideStatus::IN_PROGRESS->value, $ride->driver_id)) {
            throw new RuntimeException('Failed to transition ride to in_progress.');
        }

        Log::info('Ride started', [
            'ride_id' => $ride->id,
            'driver_id' => $ride->driver_id,
        ]);

        $this->socketService::broadcastToRide($ride->id, 'ride:started', [
            'rideId' => $ride->id,
            'status' => RideStatus::IN_PROGRESS->value,
            'started_at' => now()->toISOString(),
        ]);

        return $ride->fresh();
    }

    public function completeRide(Ride $ride): Ride
    {
        return DB::transaction(function () use ($ride) {
            $lockedRide = Ride::where('id', $ride->id)
                ->where('status', RideStatus::IN_PROGRESS->value)
                ->lockForUpdate()
                ->first();

            if (! $lockedRide) {
                throw new RuntimeException('Ride is not in progress or has already been completed.');
            }

            if ($lockedRide->driver?->current_latitude !== null && $lockedRide->driver?->current_longitude !== null) {
                $this->validateDriverLocation(
                    (float) $lockedRide->driver->current_latitude,
                    (float) $lockedRide->driver->current_longitude,
                );
            }

            $fareCalculationLog = [
                'method' => null,
                'distance_km' => null,
                'duration_minutes' => null,
                'spoofed_points_detected' => 0,
                'valid_points_used' => 0,
                'estimated_fare_at_booking' => (float) $lockedRide->estimated_fare_at_booking,
                'calculated_fare' => null,
                'fare_deviation_pct' => null,
                'adjusted_to_estimate' => false,
                'timestamp' => now()->toISOString(),
            ];

            $calculationResult = $this->calculateServerSideFare($lockedRide, $fareCalculationLog);

            $actualDistance = $calculationResult['distance_km'];
            $actualDuration = $calculationResult['duration_minutes'];
            $fareCalculationLog = $calculationResult['log'];

            $baseFare = (float) $lockedRide->base_fare;
            $perKmFare = (float) $lockedRide->per_km_fare;
            $surgeMultiplier = (float) $lockedRide->surge_multiplier;
            $category = $lockedRide->category;

            $rates = $this->fareCalculationService->getFareRates($category);

            $billedKm = max($actualDistance, 1.0);
            $distanceFare = $billedKm * $perKmFare;
            $timeFare = $actualDuration * (float) $rates->per_minute_rate;
            $subtotal = $baseFare + $distanceFare + $timeFare;

            if ($subtotal < $rates->minimum_fare) {
                $subtotal = $rates->minimum_fare;
            }

            $subtotal *= $surgeMultiplier;

            $discountAmount = (float) ($lockedRide->discount_amount ?? 0);
            $totalFare = max(round($subtotal - $discountAmount, 2), 0.0);

            $estimatedFareAtBooking = (float) $lockedRide->estimated_fare_at_booking;

            if ($estimatedFareAtBooking > 0) {
                $deviation = abs($totalFare - $estimatedFareAtBooking) / $estimatedFareAtBooking;

                $fareCalculationLog['calculated_fare'] = $totalFare;
                $fareCalculationLog['fare_deviation_pct'] = round($deviation * 100, 2);

                if ($deviation > self::FARE_DEVIATION_THRESHOLD) {
                    Log::warning('Fare deviation exceeds threshold, adjusting to estimate', [
                        'ride_id' => $lockedRide->id,
                        'calculated_fare' => $totalFare,
                        'estimated_fare' => $estimatedFareAtBooking,
                        'deviation_pct' => round($deviation * 100, 2),
                        'driver_id' => $lockedRide->driver_id,
                    ]);

                    $maxFare = round($estimatedFareAtBooking * (1 + self::FARE_DEVIATION_THRESHOLD), 2);
                    $minFare = round($estimatedFareAtBooking * (1 - self::FARE_DEVIATION_THRESHOLD), 2);
                    $totalFare = max(min($totalFare, $maxFare), $minFare);
                    $fareCalculationLog['adjusted_to_estimate'] = true;
                    $fareCalculationLog['final_fare_after_adjustment'] = $totalFare;
                }
            }

            if ($totalFare < $rates->minimum_fare) {
                $totalFare = $rates->minimum_fare;
            }

            $lockedRide->update([
                'status' => RideStatus::COMPLETED->value,
                'completed_at' => now(),
                'distance_km' => round($actualDistance, 3),
                'duration_minutes' => round($actualDuration, 1),
                'server_calculated_distance_km' => round($actualDistance, 3),
                'server_calculated_duration_minutes' => round($actualDuration, 1),
                'total_fare' => $totalFare,
                'dropoff_reached_at' => now(),
                'fare_calculation_log' => $fareCalculationLog,
                'status_history' => array_merge(
                    $lockedRide->status_history ?? [],
                    [['status' => RideStatus::COMPLETED->value, 'at' => now()->toISOString()]]
                ),
            ]);

            RideStatusHistory::create([
                'ride_id' => $lockedRide->id,
                'from_status' => RideStatus::IN_PROGRESS->value,
                'to_status' => RideStatus::COMPLETED->value,
                'actor_id' => $lockedRide->driver_id,
            ]);

            $lockedRide->driver?->update(['current_ride_id' => null]);

            Log::info('Ride completed (server-calculated fare)', [
                'ride_id' => $lockedRide->id,
                'driver_id' => $lockedRide->driver_id,
                'actual_distance_km' => $actualDistance,
                'actual_duration_min' => $actualDuration,
                'total_fare' => $totalFare,
                'calculation_method' => $fareCalculationLog['method'],
                'spoofed_points' => $fareCalculationLog['spoofed_points_detected'],
                'valid_points' => $fareCalculationLog['valid_points_used'],
                'deviation_from_estimate' => $fareCalculationLog['fare_deviation_pct'] ?? 0,
                'adjusted_to_estimate' => $fareCalculationLog['adjusted_to_estimate'],
            ]);

            $this->socketService::broadcastToRide($lockedRide->id, 'ride:completed', [
                'rideId' => $lockedRide->id,
                'status' => RideStatus::COMPLETED->value,
                'total_fare' => $totalFare,
                'distance_km' => round($actualDistance, 3),
                'duration_minutes' => round($actualDuration, 1),
            ]);

            return $lockedRide->fresh();
        });
    }

    public function cancelRide(Ride $ride, string $reason, string $cancelledBy): Ride
    {
        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        $terminalStatuses = [
            RideStatus::COMPLETED->value,
            RideStatus::CANCELLED->value,
            RideStatus::NO_SHOW->value,
        ];

        if (in_array($currentStatus, $terminalStatuses)) {
            throw new RuntimeException('Ride is already in a terminal state: ' . $currentStatus);
        }

        $cancellableStatuses = [
            RideStatus::SEARCHING->value,
            RideStatus::DRIVER_ASSIGNED->value,
            RideStatus::ACCEPTED->value,
            RideStatus::DRIVER_EN_ROUTE->value,
            RideStatus::ARRIVED->value,
            RideStatus::WAITING_FOR_RIDER->value,
            RideStatus::IN_PROGRESS->value,
        ];

        if (! in_array($currentStatus, $cancellableStatuses)) {
            throw new RuntimeException('Ride cannot be cancelled from status: ' . $currentStatus);
        }

        $cancellationFee = 0.0;
        if (in_array($currentStatus, [RideStatus::ACCEPTED->value, RideStatus::DRIVER_EN_ROUTE->value, RideStatus::ARRIVED->value])) {
            $cancellationFee = round((float) $ride->total_fare * 0.10, 2);
            $cancellationFee = max($cancellationFee, 10.0);
        }

        $ride->update([
            'status' => RideStatus::CANCELLED->value,
            'cancelled_at' => now(),
            'cancelled_by' => $cancelledBy,
            'cancellation_reason' => $reason,
            'cancellation_fee' => $cancellationFee,
            'cancelled_by_system' => $cancelledBy === 'system',
            'status_history' => array_merge(
                $ride->status_history ?? [],
                [['status' => RideStatus::CANCELLED->value, 'at' => now()->toISOString(), 'by' => $cancelledBy, 'reason' => $reason]]
            ),
        ]);

        RideStatusHistory::create([
            'ride_id' => $ride->id,
            'from_status' => $currentStatus,
            'to_status' => RideStatus::CANCELLED->value,
            'actor_id' => $cancelledBy,
            'reason' => $reason,
        ]);

        if ($ride->driver_id) {
            User::where('id', $ride->driver_id)->update(['current_ride_id' => null]);
        }

        $this->lastFraudViolation = null;

        if ($ride->driver_id && $cancelledBy !== 'system' && $cancelledBy === (string) $ride->driver_id) {
            $driver = User::find($ride->driver_id);

            if ($driver) {
                $this->lastFraudViolation = $this->fraudGuardService->evaluateCancellation(
                    $ride->fresh(),
                    $driver,
                    $reason,
                    $currentStatus,
                );

                if ($this->lastFraudViolation) {
                    $this->fraudGuardService->detectCollusion($ride->rider, $driver);
                }
            }
        }

        Log::info('Ride cancelled', [
            'ride_id' => $ride->id,
            'cancelled_by' => $cancelledBy,
            'reason' => $reason,
            'cancellation_fee' => $cancellationFee,
            'previous_status' => $currentStatus,
        ]);

        $this->socketService::broadcastToRide($ride->id, 'ride:cancelled', [
            'rideId' => $ride->id,
            'status' => RideStatus::CANCELLED->value,
            'cancelled_by' => $cancelledBy,
            'cancellation_fee' => $cancellationFee,
        ]);

        return $ride->fresh();
    }

    public function trackRide(Ride $ride): array
    {
        $driver = $ride->driver;

        if (! $driver) {
            return [
                'ride_id' => $ride->id,
                'status' => $ride->status,
                'driver' => null,
                'pickup' => [
                    'latitude' => (float) $ride->pickup_latitude,
                    'longitude' => (float) $ride->pickup_longitude,
                    'address' => $ride->pickup_address,
                ],
                'dropoff' => [
                    'latitude' => (float) $ride->dropoff_latitude,
                    'longitude' => (float) $ride->dropoff_longitude,
                    'address' => $ride->dropoff_address,
                ],
            ];
        }

        $driverLat = (float) $driver->current_latitude;
        $driverLng = (float) $driver->current_longitude;

        $pickupLat = (float) $ride->pickup_latitude;
        $pickupLng = (float) $ride->pickup_longitude;

        $distanceToPickup = $this->rideMatchingService->calculateDistance(
            $driverLat,
            $driverLng,
            $pickupLat,
            $pickupLng,
        );

        $etaToPickup = $this->rideMatchingService->calculateETA(
            $driverLat,
            $driverLng,
            $pickupLat,
            $pickupLng,
        );

        $estimatedArrivalSeconds = null;
        if ($ride->status instanceof RideStatus) {
            $estimatedArrivalSeconds = match ($ride->status) {
                RideStatus::ACCEPTED, RideStatus::DRIVER_EN_ROUTE => $etaToPickup,
                RideStatus::ARRIVED, RideStatus::WAITING_FOR_RIDER => 0,
                RideStatus::IN_PROGRESS => $this->estimateRemainingTime($ride),
                default => null,
            };
        }

        return [
            'ride_id' => $ride->id,
            'status' => $ride->status,
            'driver' => [
                'id' => $driver->id,
                'name' => $driver->name,
                'latitude' => $driverLat,
                'longitude' => $driverLng,
                'heading' => null,
                'speed' => null,
                'vehicle' => $driver->vehicle ? [
                    'make' => $driver->vehicle->make,
                    'model' => $driver->vehicle->model,
                    'color' => $driver->vehicle->color,
                    'plate_number' => $driver->vehicle->plate_number,
                ] : null,
            ],
            'pickup' => [
                'latitude' => $pickupLat,
                'longitude' => $pickupLng,
                'address' => $ride->pickup_address,
            ],
            'dropoff' => [
                'latitude' => (float) $ride->dropoff_latitude,
                'longitude' => (float) $ride->dropoff_longitude,
                'address' => $ride->dropoff_address,
            ],
            'eta_to_pickup_seconds' => $etaToPickup,
            'distance_to_pickup_km' => round($distanceToPickup, 2),
            'estimated_arrival_seconds' => $estimatedArrivalSeconds,
            'total_fare' => (float) $ride->total_fare,
            'distance_km' => (float) $ride->distance_km,
            'duration_minutes' => (float) $ride->duration_minutes,
        ];
    }

    public function rateRide(Ride $ride, int $rating, ?string $feedback): Ride
    {
        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if ($currentStatus !== RideStatus::COMPLETED->value) {
            throw new RuntimeException('Only completed rides can be rated.');
        }

        if ($rating < 1 || $rating > 5) {
            throw new RuntimeException('Rating must be between 1 and 5.');
        }

        if (! $ride->driver_id) {
            throw new RuntimeException('No driver to rate for this ride.');
        }

        $rider = User::find($ride->rider_id);
        $driver = User::find($ride->driver_id);

        if (! $rider || ! $driver) {
            throw new RuntimeException('Rider or driver not found.');
        }

        $this->ratingService->rateRide(
            $ride,
            $rider,
            $driver,
            $rating,
            $feedback,
        );

        $driverProfile = $driver->driverProfile;
        if ($driverProfile) {
            $driverProfile->update([
                'rating_sum' => $driverProfile->rating_sum + $rating,
                'rating_count' => $driverProfile->rating_count + 1,
            ]);
        }

        Log::info('Ride rated', [
            'ride_id' => $ride->id,
            'rider_id' => $ride->rider_id,
            'driver_id' => $ride->driver_id,
            'rating' => $rating,
            'has_feedback' => $feedback !== null,
        ]);

        return $ride->fresh();
    }

    public function driverArrived(Ride $ride): Ride
    {
        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if (! in_array($currentStatus, [
            RideStatus::ACCEPTED->value,
            RideStatus::DRIVER_EN_ROUTE->value,
        ])) {
            throw new RuntimeException(
                'Driver cannot mark as arrived from status: ' . $currentStatus
            );
        }

        if ($currentStatus === RideStatus::ACCEPTED->value
            && ! $ride->transitionTo(RideStatus::DRIVER_EN_ROUTE->value, $ride->driver_id)) {
            throw new RuntimeException('Failed to transition ride to driver en route.');
        }

        if (! $ride->transitionTo(RideStatus::ARRIVED->value, $ride->driver_id)) {
            throw new RuntimeException('Failed to transition ride to arrived.');
        }

        Log::info('Driver arrived at pickup', [
            'ride_id' => $ride->id,
            'driver_id' => $ride->driver_id,
        ]);

        $this->socketService::broadcastToRide($ride->id, 'ride:driver-arrived', [
            'rideId' => $ride->id,
            'status' => RideStatus::ARRIVED->value,
            'driver_lat' => $ride->driver?->current_latitude,
            'driver_lng' => $ride->driver?->current_longitude,
        ]);

        return $ride->fresh();
    }

    public function markNoShow(Ride $ride, string $actorId): Ride
    {
        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if (! in_array($currentStatus, [
            RideStatus::ACCEPTED->value,
            RideStatus::ARRIVED->value,
            RideStatus::WAITING_FOR_RIDER->value,
        ])) {
            throw new RuntimeException('Ride cannot be marked as no-show from status: ' . $currentStatus);
        }

        if (! $ride->transitionTo(RideStatus::NO_SHOW->value, $actorId, 'rider_no_show')) {
            throw new RuntimeException('Failed to mark ride as no-show.');
        }

        if ($ride->driver_id) {
            User::where('id', $ride->driver_id)->update(['current_ride_id' => null]);
        }

        Log::info('Ride marked as no-show', [
            'ride_id' => $ride->id,
            'actor_id' => $actorId,
        ]);

        $this->socketService::broadcastToRide($ride->id, 'ride:no-show', [
            'rideId' => $ride->id,
            'status' => RideStatus::NO_SHOW->value,
        ]);

        return $ride->fresh();
    }

    public function getCurrentRideForUser(User $user): ?Ride
    {
        return Ride::whereIn('status', [
            RideStatus::SEARCHING->value,
            RideStatus::DRIVER_ASSIGNED->value,
            RideStatus::ACCEPTED->value,
            RideStatus::DRIVER_EN_ROUTE->value,
            RideStatus::ARRIVED->value,
            RideStatus::WAITING_FOR_RIDER->value,
            RideStatus::IN_PROGRESS->value,
            RideStatus::NEAR_DROP_OFF->value,
        ])
            ->where(function ($q) use ($user) {
                $q->where('rider_id', $user->id)
                    ->orWhere('driver_id', $user->id);
            })
            ->latest()
            ->first();
    }

    public function expandSearchRadius(Ride $ride): float
    {
        $currentRadius = (float) ($ride->search_radius_km ?? 5.0);
        $newRadius = min($currentRadius + 2.0, 15.0);

        $ride->update(['search_radius_km' => $newRadius]);

        Log::info('Search radius expanded for ride', [
            'ride_id' => $ride->id,
            'old_radius' => $currentRadius,
            'new_radius' => $newRadius,
        ]);

        return $newRadius;
    }

    public function updateDriverLocation(User $driver, float $lat, float $lng): void
    {
        $previousLat = (float) $driver->current_latitude;
        $previousLng = (float) $driver->current_longitude;
        $previousUpdate = $driver->last_location_update;

        $validationFailed = false;

        if ($previousLat !== 0.0 && $previousLng !== 0.0 && $previousUpdate) {
            try {
                $this->validateDriverLocation($lat, $lng, $previousLat, $previousLng, $previousUpdate);
            } catch (RuntimeException $e) {
                $validationFailed = true;

                if ($driver->current_ride_id) {
                    $activeRide = Ride::where('id', $driver->current_ride_id)
                        ->where('status', RideStatus::IN_PROGRESS->value)
                        ->first();

                    if ($activeRide) {
                        $this->logRideLocation($activeRide, $driver, $lat, $lng);
                    }
                }

                throw $e;
            }
        }

        $driver->update([
            'current_latitude' => $lat,
            'current_longitude' => $lng,
            'last_location_update' => now(),
        ]);

        if ($driver->current_ride_id) {
            $activeRide = Ride::where('id', $driver->current_ride_id)
                ->where('status', RideStatus::IN_PROGRESS->value)
                ->first();

            if ($activeRide) {
                $this->logRideLocation($activeRide, $driver, $lat, $lng);
            }

            $this->socketService::broadcastToRide($driver->current_ride_id, 'ride:driver-location', [
                'driver_id' => $driver->id,
                'latitude' => $lat,
                'longitude' => $lng,
                'timestamp' => now()->toISOString(),
            ]);
        }
    }

    public function findPoolMatches(Ride $ride, float $maxDetourKm = 3.0): Collection
    {
        $pickupLat = (float) $ride->pickup_latitude;
        $pickupLng = (float) $ride->pickup_longitude;
        $dropoffLat = (float) $ride->dropoff_latitude;
        $dropoffLng = (float) $ride->dropoff_longitude;

        $existingPoolIds = PoolPassenger::where('status', '!=', 'completed')
            ->pluck('ride_id')
            ->toArray();

        $candidates = Ride::where('status', RideStatus::SEARCHING->value)
            ->where('category', $ride->category)
            ->where('id', '!=', $ride->id)
            ->whereNotIn('id', $existingPoolIds)
            ->where('rider_id', '!=', $ride->rider_id)
            ->get()
            ->filter(function (Ride $candidate) use ($pickupLat, $pickupLng, $dropoffLat, $dropoffLng, $maxDetourKm) {
                $candidatePickupLat = (float) $candidate->pickup_latitude;
                $candidatePickupLng = (float) $candidate->pickup_longitude;
                $candidateDropoffLat = (float) $candidate->dropoff_latitude;
                $candidateDropoffLng = (float) $candidate->dropoff_longitude;

                $pickupToPickup = $this->rideMatchingService->calculateDistance(
                    $pickupLat,
                    $pickupLng,
                    $candidatePickupLat,
                    $candidatePickupLng,
                );

                if ($pickupToPickup > $maxDetourKm) {
                    return false;
                }

                $pickupToDropoff = $this->rideMatchingService->calculateDistance(
                    $pickupLat,
                    $pickupLng,
                    $candidateDropoffLat,
                    $candidateDropoffLng,
                );

                $originalDistance = $this->rideMatchingService->calculateDistance(
                    $pickupLat,
                    $pickupLng,
                    $dropoffLat,
                    $dropoffLng,
                );

                $detour = $pickupToDropoff - $originalDistance;

                return $detour <= $maxDetourKm;
            })
            ->values();

        return $candidates;
    }

    private function validateRiderCanRequestRide(User $rider): void
    {
        if (! $rider->is_active) {
            throw new RuntimeException('Your account is not active.');
        }

        $activeRide = Ride::whereIn('status', [
            RideStatus::SEARCHING->value,
            RideStatus::ACCEPTED->value,
            RideStatus::DRIVER_EN_ROUTE->value,
            RideStatus::ARRIVED->value,
            RideStatus::WAITING_FOR_RIDER->value,
            RideStatus::IN_PROGRESS->value,
        ])
            ->where('rider_id', $rider->id)
            ->exists();

        if ($activeRide) {
            throw new RuntimeException('You already have an active ride.');
        }
    }

    private function getNightSurgeMultiplier(float $lat, float $lng, string $category, ?string $tenantId): float
    {
        $hour = (int) now()->format('H');

        if ($hour >= 22 || $hour < 5) {
            $baseSurge = $this->surgePricingService->getCurrentSurge($lat, $lng, $category, $tenantId);

            return round(max($baseSurge, self::NIGHT_SURGE_MULTIPLIER), 2);
        }

        return $this->surgePricingService->getCurrentSurge($lat, $lng, $category, $tenantId);
    }

    private function validateDriverLocation(
        float $lat,
        float $lng,
        ?float $previousLat = null,
        ?float $previousLng = null,
        mixed $previousUpdate = null,
    ): void {
        if ($lat == 0.0 && $lng == 0.0) {
            throw new RuntimeException('Invalid driver location: coordinates cannot be zero.');
        }

        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            throw new RuntimeException('Invalid driver location: coordinates out of range.');
        }

        if ($previousLat !== null && $previousLng !== null && $previousUpdate) {
            $distance = $this->rideMatchingService->calculateDistance(
                $previousLat,
                $previousLng,
                $lat,
                $lng,
            );

            $timeSinceLastUpdate = abs(now()->diffInSeconds(now()->parse($previousUpdate)));

            if ($distance > self::MAX_LOCATION_JUMP_KM && $timeSinceLastUpdate < self::GPS_SPOOF_THRESHOLD_SECONDS) {
                Log::warning('Possible GPS spoofing detected', [
                    'lat' => $lat,
                    'lng' => $lng,
                    'previous_lat' => $previousLat,
                    'previous_lng' => $previousLng,
                    'distance_km' => round($distance, 2),
                    'time_seconds' => $timeSinceLastUpdate,
                ]);

                throw new RuntimeException('Location update rejected: impossible movement detected.');
            }
        }
    }

    public function logRideLocation(
        Ride $ride,
        User $driver,
        float $lat,
        float $lng,
        ?float $accuracy = null,
        ?float $speed = null,
        ?float $heading = null,
        ?int $batteryLevel = null,
    ): RideLocationLog {
        $isSpoofed = false;
        $spoofReason = null;

        $recentLogs = RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', false)
            ->orderByDesc('recorded_at')
            ->limit(5)
            ->get();

        if ($recentLogs->isNotEmpty()) {
            $lastValid = $recentLogs->first();
            $distanceKm = $this->rideMatchingService->calculateDistance(
                (float) $lastValid->latitude,
                (float) $lastValid->longitude,
                $lat,
                $lng,
            );
            $timeSeconds = abs(now()->diffInSeconds(now()->parse($lastValid->recorded_at)));

            if ($timeSeconds > 0 && $distanceKm > 0) {
                $speedKmh = ($distanceKm / $timeSeconds) * 3600;

                if ($speedKmh > self::MAX_REALISTIC_SPEED_KMH) {
                    $isSpoofed = true;
                    $spoofReason = "Impossible speed: {$speedKmh} km/h (max: " . self::MAX_REALISTIC_SPEED_KMH . ")";
                } elseif ($distanceKm > self::MAX_LOCATION_JUMP_KM && $timeSeconds < self::GPS_SPOOF_THRESHOLD_SECONDS) {
                    $isSpoofed = true;
                    $spoofReason = "Location jump: {$distanceKm}km in {$timeSeconds}s";
                }
            }
        }

        if ($lat == 0.0 && $lng == 0.0) {
            $isSpoofed = true;
            $spoofReason = 'Zero coordinates submitted';
        }

        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            $isSpoofed = true;
            $spoofReason = "Invalid coordinates: {$lat}, {$lng}";
        }

        $locationLog = RideLocationLog::create([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'latitude' => $lat,
            'longitude' => $lng,
            'accuracy_meters' => $accuracy,
            'speed_kmh' => $speed,
            'heading' => $heading,
            'battery_level' => $batteryLevel,
            'is_spoofed' => $isSpoofed,
            'spoof_reason' => $spoofReason,
            'recorded_at' => now(),
        ]);

        if ($isSpoofed) {
            Log::warning('GPS spoofing detected during ride', [
                'ride_id' => $ride->id,
                'driver_id' => $driver->id,
                'reason' => $spoofReason,
                'lat' => $lat,
                'lng' => $lng,
            ]);
        }

        return $locationLog;
    }

    private function calculateServerSideFare(Ride $ride, array &$fareCalculationLog): array
    {
        $locationLogs = RideLocationLog::where('ride_id', $ride->id)
            ->orderBy('recorded_at')
            ->get();

        $validLogs = $locationLogs->where('is_spoofed', false);

        $fareCalculationLog['spoofed_points_detected'] = $locationLogs->count() - $validLogs->count();
        $fareCalculationLog['valid_points_used'] = $validLogs->count();

        if ($validLogs->count() >= self::MIN_LOCATION_POINTS_FOR_FARE) {
            $fareCalculationLog['method'] = 'gps_tracking';

            $totalDistanceKm = 0.0;
            $points = $validLogs->values();

            for ($i = 1; $i < $points->count(); $i++) {
                $totalDistanceKm += $this->rideMatchingService->calculateDistance(
                    (float) $points[$i - 1]->latitude,
                    (float) $points[$i - 1]->longitude,
                    (float) $points[$i]->latitude,
                    (float) $points[$i]->longitude,
                );
            }

            $firstPoint = $points->first();
            $lastPoint = $points->last();
            $durationSeconds = now()->parse($firstPoint->recorded_at)
                ->diffInSeconds(now()->parse($lastPoint->recorded_at));
            $durationMinutes = max(round($durationSeconds / 60, 1), 0.5);

            $totalDistanceKm = max($totalDistanceKm, 0.1);

            return [
                'distance_km' => round($totalDistanceKm, 3),
                'duration_minutes' => $durationMinutes,
                'log' => $fareCalculationLog,
            ];
        }

        Log::warning('Insufficient GPS data for ride, falling back to route service', [
            'ride_id' => $ride->id,
            'valid_points' => $validLogs->count(),
        ]);

        $fareCalculationLog['method'] = 'route_service_fallback';

        $route = $this->routeService->getRoute(
            (float) $ride->pickup_latitude,
            (float) $ride->pickup_longitude,
            (float) $ride->dropoff_latitude,
            (float) $ride->dropoff_longitude,
        );

        $rideStartedAt = $ride->started_at ?? $ride->created_at;
        $rideCompletedAt = now();
        $actualDurationMinutes = max(round($rideStartedAt->diffInSeconds($rideCompletedAt) / 60, 1), 0.5);

        $fareCalculationLog['route_service_distance_km'] = $route['distance_km'];
        $fareCalculationLog['route_service_duration_minutes'] = $route['duration_minutes'];
        $fareCalculationLog['actual_duration_minutes'] = $actualDurationMinutes;

        $estimatedDistanceKm = (float) $ride->distance_km;
        $estimatedDurationMinutes = (float) $ride->duration_minutes;

        if ($estimatedDistanceKm > 0) {
            $distanceDeviation = abs($route['distance_km'] - $estimatedDistanceKm) / $estimatedDistanceKm;
            if ($distanceDeviation > self::FARE_DEVIATION_THRESHOLD) {
                $fareCalculationLog['distance_deviation_flagged'] = true;
                Log::warning('Route distance deviates significantly from estimate', [
                    'ride_id' => $ride->id,
                    'estimated_km' => $estimatedDistanceKm,
                    'route_km' => $route['distance_km'],
                    'deviation' => round($distanceDeviation * 100, 2) . '%',
                ]);
            }
        }

        return [
            'distance_km' => $route['distance_km'],
            'duration_minutes' => $actualDurationMinutes,
            'log' => $fareCalculationLog,
        ];
    }

    private function estimateRemainingTime(Ride $ride): int
    {
        $driverLat = (float) $ride->driver?->current_latitude;
        $driverLng = (float) $ride->driver?->current_longitude;
        $dropoffLat = (float) $ride->dropoff_latitude;
        $dropoffLng = (float) $ride->dropoff_longitude;

        if ($driverLat === 0.0 && $driverLng === 0.0) {
            return (int) ((float) $ride->duration_minutes * 60);
        }

        return $this->rideMatchingService->calculateETA(
            $driverLat,
            $driverLng,
            $dropoffLat,
            $dropoffLng,
        );
    }
}
