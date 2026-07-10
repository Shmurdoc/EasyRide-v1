<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\NewRideRequest;
use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class RideMatchingService
{
    public function accept(Ride $ride, User $driver): array
    {
        if ($ride->status !== RideStatus::SEARCHING) {
            return ['success' => false, 'message' => 'Ride is no longer available.'];
        }

        $this->assignDriver($ride, $driver);

        return ['success' => true, 'message' => 'Ride accepted.'];
    }

    public function findNearbyDrivers(
        float $lat,
        float $lng,
        string $category = 'standard',
        float $radiusKm = 5.0,
    ): Collection {
        return User::role('driver')
            ->where('is_online', true)
            ->whereNull('current_ride_id')
            ->whereHas('vehicle', fn ($q) => $q->where('category', $category)->where('is_active', true))
            ->select('*')
            ->selectRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) * cos(radians(current_longitude) - radians(?)) + sin(radians(?)) * sin(radians(current_latitude)))) AS distance',
                [$lat, $lng, $lat]
            )
            ->orderBy('distance')
            ->get()
            ->filter(fn ($user) => ($user->distance ?? PHP_FLOAT_MAX) <= $radiusKm)
            ->values();
    }

    public function assignDriver(Ride $ride, User $driver): Ride
    {
        return DB::transaction(function () use ($ride, $driver) {
            $lockedRide = Ride::where('id', $ride->id)->where('status', 'searching')->first();

            if (! $lockedRide) {
                throw new \RuntimeException('Ride is no longer available.');
            }

            $distance = $this->calculateDistance(
                (float) $lockedRide->pickup_latitude,
                (float) $lockedRide->pickup_longitude,
                (float) $driver->current_latitude,
                (float) $driver->current_longitude,
            );

            $lockedRide->update([
                'driver_id' => $driver->id,
                'status' => 'accepted',
                'driver_eta' => $this->calculateETA(
                    (float) $driver->current_latitude,
                    (float) $driver->current_longitude,
                    (float) $lockedRide->pickup_latitude,
                    (float) $lockedRide->pickup_longitude,
                ),
            ]);

            $driver->update(['current_ride_id' => $lockedRide->id]);

            return $lockedRide->fresh();
        });
    }

    public function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLng / 2) ** 2;

        $c = 2 * asin(sqrt($a));

        return round($earthRadius * $c, 3);
    }

    public function calculateETA(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        $distance = $this->calculateDistance($lat1, $lng1, $lat2, $lng2);
        $averageSpeedKmh = 30.0;

        return (int) round(($distance / $averageSpeedKmh) * 3600);
    }

    public function notifyNearbyDrivers(Ride $ride): void
    {
        $nearbyDrivers = $this->findNearbyDrivers(
            (float) $ride->pickup_latitude,
            (float) $ride->pickup_longitude,
            $ride->category,
        );

        $driverIds = $nearbyDrivers->pluck('id')->toArray();
        NewRideRequest::dispatch($ride, $driverIds);
    }

    public function expireStaleRides(): int
    {
        $count = Ride::where('status', 'searching')
            ->where('created_at', '<', now()->subSeconds(60))
            ->update([
                'status' => 'cancelled',
                'cancelled_by' => 'system',
                'cancelled_at' => now(),
                'cancellation_reason' => 'no_driver_available',
            ]);

        return $count;
    }
}
