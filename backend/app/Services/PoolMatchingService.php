<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PoolPassenger;
use App\Models\PoolRide;
use App\Models\Ride;
use Illuminate\Support\Collection;

class PoolMatchingService
{
    private const float EARTH_RADIUS_KM = 6371.0;
    private const float MAX_DIRECTION_DEGREES = 45.0;
    private const float MAX_DETOUR_KM = 0.5;

    public function __construct(
        protected FareCalculationService $fareCalculationService,
    ) {}

    public function findMatches(Ride $ride): Collection
    {
        $poolRides = PoolRide::active()
            ->whereHas('driver', fn ($q) => $q->where('is_online', true))
            ->get()
            ->filter(fn (PoolRide $pool) => $pool->hasAvailableSeats());

        $matches = collect();

        foreach ($poolRides as $pool) {
            $score = $this->calculateMatchScore($pool, $ride);

            if ($score > 0) {
                $matches->push([
                    'pool_ride' => $pool,
                    'score' => $score,
                    'detour_km' => $this->calculateDetour(
                        $pool,
                        $ride->pickup_latitude,
                        $ride->pickup_longitude,
                        $ride->dropoff_latitude,
                        $ride->dropoff_longitude
                    ),
                ]);
            }
        }

        return $matches->sortByDesc('score')->values();
    }

    public function calculateMatchScore(PoolRide $pool, Ride $ride): float
    {
        $directionScore = $this->calculateDirectionScore($pool, $ride);
        $detourScore = $this->calculateDetourScore($pool, $ride);
        $timeScore = $this->calculateTimeScore($pool, $ride);

        if ($directionScore === 0.0 || $detourScore === 0.0) {
            return 0.0;
        }

        return round(
            ($directionScore * 0.4) + ($detourScore * 0.3) + ($timeScore * 0.3),
            2
        );
    }

    public function calculateDetour(
        PoolRide $pool,
        float $newPickupLat,
        float $newPickupLng,
        float $newDropoffLat,
        float $newDropoffLng,
    ): float {
        $existingPassengers = $pool->passengers()->get();
        $originRide = $pool->ride;

        $existingPickupLat = (float) $originRide->pickup_latitude;
        $existingPickupLng = (float) $originRide->pickup_longitude;
        $existingDropoffLat = (float) $originRide->dropoff_latitude;
        $existingDropoffLng = (float) $originRide->dropoff_longitude;

        $originalDistance = $this->haversineDistance(
            $existingPickupLat, $existingPickupLng,
            $existingDropoffLat, $existingDropoffLng
        );

        $withNewPassengerDistance = $this->haversineDistance(
            $existingPickupLat, $existingPickupLng,
            $newPickupLat, $newPickupLng
        ) + $this->haversineDistance(
            $newPickupLat, $newPickupLng,
            $newDropoffLat, $newDropoffLng
        ) + $this->haversineDistance(
            $newDropoffLat, $newDropoffLng,
            $existingDropoffLat, $existingDropoffLng
        );

        return max(0, $withNewPassengerDistance - $originalDistance);
    }

    public function calculateAngle(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $lng1Rad = deg2rad($lng1);
        $lng2Rad = deg2rad($lng2);
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);

        $dLng = $lng2Rad - $lng1Rad;

        $y = sin($dLng) * cos($lat2Rad);
        $x = cos($lat1Rad) * sin($lat2Rad) - sin($lat1Rad) * cos($lat2Rad) * cos($dLng);

        $bearing = rad2deg(atan2($y, $x));

        return ($bearing + 360) % 360;
    }

    private function calculateDirectionScore(PoolRide $pool, Ride $ride): float
    {
        $originRide = $pool->ride;

        $poolAngle = $this->calculateAngle(
            (float) $originRide->pickup_latitude,
            (float) $originRide->pickup_longitude,
            (float) $originRide->dropoff_latitude,
            (float) $originRide->dropoff_longitude
        );

        $rideAngle = $this->calculateAngle(
            (float) $ride->pickup_latitude,
            (float) $ride->pickup_longitude,
            (float) $ride->dropoff_latitude,
            (float) $ride->dropoff_longitude
        );

        $angleDiff = abs($poolAngle - $rideAngle);
        if ($angleDiff > 180) {
            $angleDiff = 360 - $angleDiff;
        }

        if ($angleDiff > self::MAX_DIRECTION_DEGREES) {
            return 0.0;
        }

        return 1.0 - ($angleDiff / self::MAX_DIRECTION_DEGREES);
    }

    private function calculateDetourScore(PoolRide $pool, Ride $ride): float
    {
        $detourKm = $this->calculateDetour(
            $pool,
            (float) $ride->pickup_latitude,
            (float) $ride->pickup_longitude,
            (float) $ride->dropoff_latitude,
            (float) $ride->dropoff_longitude
        );

        if ($detourKm > self::MAX_DETOUR_KM) {
            return 0.0;
        }

        return 1.0 - ($detourKm / self::MAX_DETOUR_KM);
    }

    private function calculateTimeScore(PoolRide $pool, Ride $ride): float
    {
        $poolPassengers = $pool->passengers()->count();

        if ($poolPassengers >= $pool->max_passengers) {
            return 0.0;
        }

        $maxWaitMinutes = 15;
        $estimatedWait = $poolPassengers * 3;

        if ($estimatedWait > $maxWaitMinutes) {
            return 0.0;
        }

        return 1.0 - ($estimatedWait / $maxWaitMinutes);
    }

    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $lat1 = deg2rad($lat1);
        $lng1 = deg2rad($lng1);
        $lat2 = deg2rad($lat2);
        $lng2 = deg2rad($lng2);

        $dlat = $lat2 - $lat1;
        $dlng = $lng2 - $lng1;

        $a = sin($dlat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($dlng / 2) ** 2;
        $c = 2 * asin(sqrt($a));

        return self::EARTH_RADIUS_KM * $c;
    }
}
