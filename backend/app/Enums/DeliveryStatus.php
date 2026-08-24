<?php

declare(strict_types=1);

namespace App\Enums;

enum DeliveryStatus: string
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case AT_PICKUP = 'at_pickup';
    case PICKED_UP = 'picked_up';
    case IN_TRANSIT = 'in_transit';
    case AT_DROPOFF = 'at_dropoff';
    case DELIVERED = 'delivered';
    case FAILED = 'failed';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::ACCEPTED => 'Accepted',
            self::AT_PICKUP => 'At Pickup',
            self::PICKED_UP => 'Picked Up',
            self::IN_TRANSIT => 'In Transit',
            self::AT_DROPOFF => 'At Dropoff',
            self::DELIVERED => 'Delivered',
            self::FAILED => 'Failed',
            self::CANCELLED => 'Cancelled',
        };
    }
}
