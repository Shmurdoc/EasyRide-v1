<?php

namespace App\Services\Payment;

use App\Jobs\ProcessPayoutJob;
use App\Models\DriverPayout;
use App\Models\Wallet;

class PayoutService
{
    public function calculateEligibleDrivers(): array
    {
        return Wallet::where('balance', '>', 0)
            ->whereHas('user', fn ($q) => $q->whereHas('driverProfile'))
            ->get()
            ->toArray();
    }

    public function processPayouts(): int
    {
        $count = 0;
        $wallets = Wallet::where('balance', '>', 0)
            ->whereHas('user', fn ($q) => $q->whereHas('driverProfile'))
            ->cursor();

        foreach ($wallets as $wallet) {
            $amount = $wallet->balance;
            if ($amount <= 0) {
                continue;
            }

            if ($this->createPayoutIfEligible($wallet, (float) $amount)) {
                $count++;
            }
        }

        return $count;
    }

    public function processDailyPayouts(): int
    {
        $count = 0;
        Wallet::where('balance', '>', 200)
            ->whereHas('user', fn ($q) => $q->whereHas('driverProfile'))
            ->each(function (Wallet $wallet) use (&$count) {
                if ($this->createPayoutIfEligible($wallet, (float) $wallet->balance)) {
                    $count++;
                }
            });

        return $count;
    }

    public function processWeeklyPayouts(): int
    {
        $count = 0;
        Wallet::whereBetween('balance', [0.01, 200])
            ->whereHas('user', fn ($q) => $q->whereHas('driverProfile'))
            ->each(function (Wallet $wallet) use (&$count) {
                if ($this->createPayoutIfEligible($wallet, (float) $wallet->balance)) {
                    $count++;
                }
            });

        return $count;
    }

    /**
     * Create a payout only if the driver has no unsettled payout. Without
     * this guard overlapping scheduler runs (daily + weekly + manual) each
     * mint a full-balance payout, queueing multiples of the driver's balance
     * (pending_payout double-counting) and racing in ProcessPayoutJob.
     */
    private function createPayoutIfEligible(Wallet $wallet, float $amount): bool
    {
        if ($amount <= 0) {
            return false;
        }

        $hasOpen = DriverPayout::where('driver_id', $wallet->user_id)
            ->whereIn('status', ['pending', 'approved', 'processing'])
            ->exists();

        if ($hasOpen) {
            return false;
        }

        $payout = DriverPayout::create([
            'tenant_id' => $wallet->user?->tenant_id ?? $wallet->tenant_id,
            'driver_id' => $wallet->user_id,
            'amount' => $amount,
            'method' => 'wallet',
            'status' => 'pending',
        ]);

        ProcessPayoutJob::dispatch($payout);

        return true;
    }
}
