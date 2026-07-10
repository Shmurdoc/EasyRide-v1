<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentStatus: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case COMPLETED = 'completed';
    case ESCROW_HELD = 'escrow_held';
    case RELEASED = 'released';
    case FAILED = 'failed';
    case REFUNDED = 'refunded';
    case DISPUTED = 'disputed';
    case RELEASE_FAILED = 'release_failed';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::PROCESSING => 'Processing',
            self::COMPLETED => 'Completed',
            self::ESCROW_HELD => 'Escrow Held',
            self::RELEASED => 'Released',
            self::FAILED => 'Failed',
            self::REFUNDED => 'Refunded',
            self::DISPUTED => 'Disputed',
            self::RELEASE_FAILED => 'Release Failed',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [
            self::COMPLETED, self::RELEASED, self::FAILED,
            self::REFUNDED, self::CANCELLED, self::RELEASE_FAILED,
        ]);
    }

    public function isActive(): bool
    {
        return in_array($this, [self::PENDING, self::PROCESSING, self::ESCROW_HELD, self::DISPUTED]);
    }
}
