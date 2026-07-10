<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentMethod: string
{
    case WALLET = 'wallet';
    case CASH = 'cash';
    case STRIPE = 'stripe';
    case PAYFAST = 'payfast';
    case OZOW = 'ozow';

    public function label(): string
    {
        return match ($this) {
            self::WALLET => 'Wallet',
            self::CASH => 'Cash',
            self::STRIPE => 'Stripe Card',
            self::PAYFAST => 'PayFast',
            self::OZOW => 'Ozow EFT',
        };
    }

    public function isGateway(): bool
    {
        return in_array($this, [self::STRIPE, self::PAYFAST, self::OZOW]);
    }

    public function requiresRedirect(): bool
    {
        return in_array($this, [self::PAYFAST, self::OZOW]);
    }

    public function supportsRefund(): bool
    {
        return $this === self::STRIPE;
    }
}
