<?php

declare(strict_types=1);

namespace App\Enums;

enum WalletTransactionType: string
{
    case DEPOSIT = 'deposit';
    case DEBIT = 'debit';
    case CREDIT = 'credit';
    case WITHDRAWAL = 'withdrawal';
    case REFUND = 'refund';
    case RIDE_EARNINGS = 'ride_earnings';
    case RIDE_CHARGE = 'ride_charge';
    case PLATFORM_FEE = 'platform_fee';
    case PROMO_CREDIT = 'promo_credit';
    case PENDING_PAYOUT = 'pending_payout';
    case DRIVER_FINE = 'driver_fine';
    case PARCEL_DELIVERY_EARNINGS = 'parcel_delivery_earnings';

    public function label(): string
    {
        return match ($this) {
            self::DEPOSIT => 'Deposit',
            self::DEBIT => 'Debit',
            self::CREDIT => 'Credit',
            self::WITHDRAWAL => 'Withdrawal',
            self::REFUND => 'Refund',
            self::RIDE_EARNINGS => 'Ride Earnings',
            self::RIDE_CHARGE => 'Ride Charge',
            self::PLATFORM_FEE => 'Platform Fee',
            self::PROMO_CREDIT => 'Promo Credit',
            self::PENDING_PAYOUT => 'Pending Payout',
        };
    }

    public function isCredit(): bool
    {
        return in_array($this, [
            self::DEPOSIT, self::CREDIT, self::REFUND,
            self::RIDE_EARNINGS, self::PROMO_CREDIT,
        ]);
    }
}
