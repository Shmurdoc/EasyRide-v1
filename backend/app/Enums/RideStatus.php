<?php

declare(strict_types=1);

namespace App\Enums;

enum RideStatus: string
{
    case REQUESTED = 'requested';
    case SEARCHING = 'searching';
    case DRIVER_ASSIGNED = 'driver_assigned';
    case ACCEPTED = 'accepted';
    case DRIVER_EN_ROUTE = 'driver_en_route';
    case ARRIVED = 'arrived';
    case WAITING_FOR_RIDER = 'waiting_for_rider';
    case IN_PROGRESS = 'in_progress';
    case NEAR_DROP_OFF = 'near_drop_off';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';
    case CANCELLATION_REQUESTED = 'cancellation_requested';
    case NO_SHOW = 'no_show';

    public function label(): string
    {
        return match ($this) {
            self::REQUESTED => 'Requested',
            self::SEARCHING => 'Searching for driver',
            self::DRIVER_ASSIGNED => 'Driver assigned',
            self::ACCEPTED => 'Driver accepted',
            self::DRIVER_EN_ROUTE => 'Driver en route',
            self::ARRIVED => 'Driver arrived',
            self::WAITING_FOR_RIDER => 'Waiting for rider',
            self::IN_PROGRESS => 'In progress',
            self::NEAR_DROP_OFF => 'Near drop-off',
            self::COMPLETED => 'Completed',
            self::CANCELLED => 'Cancelled',
            self::CANCELLATION_REQUESTED => 'Cancellation requested',
            self::NO_SHOW => 'No show',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::COMPLETED, self::CANCELLED, self::NO_SHOW]);
    }

    public function canBeCancelled(): bool
    {
        return in_array($this, [
            self::SEARCHING,
            self::DRIVER_ASSIGNED,
            self::ACCEPTED,
            self::DRIVER_EN_ROUTE,
            self::ARRIVED,
            self::WAITING_FOR_RIDER,
        ]);
    }

    public function isActive(): bool
    {
        return ! $this->isTerminal() && $this !== self::CANCELLATION_REQUESTED;
    }
}
