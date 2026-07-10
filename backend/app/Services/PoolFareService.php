<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PoolPassenger;
use App\Models\PoolRide;
use App\Models\Ride;
use Illuminate\Support\Collection;

class PoolFareService
{
    private const float DRIVER_BASE_PERCENTAGE = 0.70;
    private const float MAIN_PASSENGER_DISCOUNT = 1.0;
    private const float ADDITIONAL_PASSENGER_DISCOUNT = 0.80;
    private const float DRIVER_BONUS_PERCENTAGE = 0.10;

    public function __construct(
        protected FareCalculationService $fareCalculationService,
    ) {}

    public function calculateShares(PoolRide $pool, Collection $passengers): array
    {
        $totalPoolFare = (float) $pool->total_fare;
        $passengerCount = $passengers->count();

        if ($passengerCount === 0) {
            return [
                'driver_share' => 0.0,
                'passenger_shares' => [],
                'total' => 0.0,
            ];
        }

        $passengerShares = [];
        $totalPassengerShare = 0.0;

        foreach ($passengers as $index => $passenger) {
            $ride = $passenger->ride;
            $individualFare = (float) $ride->total_fare;

            $discount = $index === 0
                ? self::MAIN_PASSENGER_DISCOUNT
                : self::ADDITIONAL_PASSENGER_DISCOUNT;

            $fareShare = round($individualFare * $discount, 2);
            $totalPassengerShare += $fareShare;

            $passengerShares[] = [
                'passenger_id' => $passenger->user_id,
                'pool_passenger_id' => $passenger->id,
                'individual_fare' => $individualFare,
                'discount_applied' => $discount,
                'fare_share' => $fareShare,
            ];
        }

        $driverBase = round($totalPoolFare * self::DRIVER_BASE_PERCENTAGE, 2);
        $driverBonus = round($totalPoolFare * self::DRIVER_BONUS_PERCENTAGE, 2);
        $driverShare = round($driverBase + $driverBonus, 2);

        return [
            'driver_share' => $driverShare,
            'driver_base' => $driverBase,
            'driver_bonus' => $driverBonus,
            'passenger_shares' => $passengerShares,
            'total_passenger_share' => round($totalPassengerShare, 2),
            'total' => round($totalPassengerShare + $driverShare, 2),
        ];
    }

    public function calculateIndividualFare(PoolRide $pool, PoolPassenger $passenger): float
    {
        $ride = $passenger->ride;
        $individualFare = (float) $ride->total_fare;

        $passengerIndex = $pool->passengers()
            ->where('pickup_order', '<=', $passenger->pickup_order)
            ->count();

        $discount = $passengerIndex === 1
            ? self::MAIN_PASSENGER_DISCOUNT
            : self::ADDITIONAL_PASSENGER_DISCOUNT;

        return round($individualFare * $discount, 2);
    }

    public function createPoolRide(Ride $originalRide, float $totalFare): PoolRide
    {
        return PoolRide::create([
            'ride_id' => $originalRide->id,
            'driver_id' => $originalRide->driver_id,
            'status' => 'matching',
            'max_passengers' => 4,
            'current_passengers' => 1,
            'total_fare' => $totalFare,
        ]);
    }

    public function addPassengerToPool(
        PoolRide $pool,
        Ride $ride,
        int $pickupOrder,
        int $dropoffOrder,
    ): PoolPassenger {
        $fareShare = $this->calculateIndividualFare(
            $pool,
            new PoolPassenger([
                'pool_ride_id' => $pool->id,
                'ride_id' => $ride->id,
                'user_id' => $ride->rider_id,
                'pickup_order' => $pickupOrder,
                'dropoff_order' => $dropoffOrder,
            ])
        );

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $pool->id,
            'ride_id' => $ride->id,
            'user_id' => $ride->rider_id,
            'fare_share' => $fareShare,
            'pickup_order' => $pickupOrder,
            'dropoff_order' => $dropoffOrder,
            'status' => 'pending',
        ]);

        $pool->addPassenger($passenger);

        return $passenger;
    }

    public function finalizePoolFare(PoolRide $pool): array
    {
        $passengers = $pool->passengers()->get();
        $shares = $this->calculateShares($pool, $passengers);

        foreach ($shares['passenger_shares'] as $share) {
            PoolPassenger::where('id', $share['pool_passenger_id'])
                ->update(['fare_share' => $share['fare_share']]);
        }

        return $shares;
    }
}
