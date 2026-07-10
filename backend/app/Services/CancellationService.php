<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\RideStatus;
use App\Models\Ride;

class CancellationService
{
    private const FEE_THRESHOLDS = [
        'searching' => ['amount' => 0, 'reason' => 'No fee — ride not matched.'],
        'driver_assigned' => ['amount' => 0, 'reason' => 'No fee — driver just assigned.'],
        'accepted' => ['amount' => 15, 'reason' => 'Driver accepted — cancellation fee applies.'],
        'driver_en_route' => ['amount' => 25, 'reason' => 'Driver en route — cancellation fee applies.'],
        'arrived' => ['amount' => 35, 'reason' => 'Driver arrived — cancellation fee applies.'],
        'waiting_for_rider' => ['amount' => 35, 'reason' => 'Waiting for rider — cancellation fee applies.'],
        'in_progress' => ['amount' => 0, 'reason' => 'Ride in progress — cannot cancel with fee, complete ride.'],
    ];

    private const NO_SHOW_FEE = 25;
    private const MAX_FEE = 50;

    public function calculateFee(Ride $ride, string $actorId): array
    {
        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        $isRider = $ride->rider_id === $actorId;
        $isDriver = $ride->driver_id === $actorId;

        if ($currentStatus === 'in_progress') {
            return [
                'amount' => 0,
                'reason' => 'Ride in progress — no cancellation fee.',
                'applicable' => false,
            ];
        }

        if (! $isRider && ! $isDriver) {
            return [
                'amount' => 0,
                'reason' => 'System-initiated cancellation — no fee.',
                'applicable' => false,
            ];
        }

        $threshold = self::FEE_THRESHOLDS[$currentStatus] ?? ['amount' => 0, 'reason' => 'No fee.'];

        $amount = min($threshold['amount'], self::MAX_FEE);

        return [
            'amount' => $amount,
            'reason' => $threshold['reason'],
            'applicable' => $amount > 0,
            'currency' => 'ZAR',
        ];
    }

    public function calculateNoShowFee(Ride $ride): array
    {
        return [
            'amount' => self::NO_SHOW_FEE,
            'reason' => 'Rider no-show fee.',
            'applicable' => true,
            'currency' => 'ZAR',
        ];
    }
}
