<?php

declare(strict_types=1);

namespace App\Enums;

enum RideCategory: string
{
    case STANDARD = 'standard';
    case PREMIUM = 'premium';
    case MINIVAN = 'minivan';
    case PETS = 'pets';
    case DELIVERY = 'delivery';

    public function label(): string
    {
        return match ($this) {
            self::STANDARD => 'Standard',
            self::PREMIUM => 'Premium',
            self::MINIVAN => 'Minivan',
            self::PETS => 'Pets',
            self::DELIVERY => 'Delivery',
        };
    }
}
