<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Payment;
use App\Models\Ride;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EscrowService
{
    private const HOLD_DURATION_HOURS = 24;

    private const DISPUTE_WINDOW_HOURS = 24;

    public function __construct(
        private readonly WalletService $walletService,
        private readonly PaymentService $paymentService,
    ) {}

    public function holdPayment(Ride $ride, string $method = 'wallet', array $gatewayData = []): Payment
    {
        $existingPayment = Payment::where('ride_id', $ride->id)
            ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_COMPLETED, Payment::STATUS_ESCROW_HELD])
            ->first();

        if ($existingPayment) {
            Log::warning('EscrowService: Double-debit prevented', [
                'ride_id' => $ride->id,
                'existing_payment_id' => $existingPayment->id,
                'existing_status' => $existingPayment->status,
                'requested_method' => $method,
            ]);

            throw new \App\Exceptions\PaymentAlreadyHeldException(
                "Payment already exists for ride {$ride->id} with status {$existingPayment->status}"
            );
        }

        return DB::transaction(function () use ($ride, $method, $gatewayData) {
            $payment = $this->paymentService->processPayment($ride, $method, $gatewayData);

            if ($method === 'wallet') {
                $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);

                $driverWallet->increment('pending_balance', (float) $payment->driver_payout);
            }

            Log::info('EscrowService: Payment held', [
                'payment_id' => $payment->id,
                'ride_id' => $ride->id,
                'method' => $method,
                'amount' => $payment->amount,
            ]);

            return $payment;
        });
    }

    public function releasePayment(Payment $payment): ?WalletTransaction
    {
        if ($payment->status !== Payment::STATUS_COMPLETED) {
            Log::warning('Escrow release: Payment not completed', ['payment_id' => $payment->id]);

            return null;
        }

        return DB::transaction(function () use ($payment) {
            $ride = $payment->ride;
            if (! $ride || ! $ride->driver) {
                Log::warning('Escrow release: No driver for payment', ['payment_id' => $payment->id]);

                return null;
            }

            $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);
            $payoutAmount = (float) ($payment->driver_payout ?? 0);

            $pendingBalance = (float) $driverWallet->pending_balance;
            if ($pendingBalance < $payoutAmount) {
                Log::warning('Escrow release: Insufficient pending balance', [
                    'pending' => $pendingBalance,
                    'payout' => $payoutAmount,
                ]);

                return null;
            }

            $driverWallet->decrement('pending_balance', $payoutAmount);

            return $this->walletService->credit(
                $driverWallet,
                $payoutAmount,
                'ride_earnings',
                $ride->id,
                "Escrow released for ride {$ride->id}",
            );
        });
    }

    public function releaseCompletedRides(): int
    {
        $released = 0;
        $cutoff = now()->subHours(self::HOLD_DURATION_HOURS);

        $payments = Payment::where('status', Payment::STATUS_COMPLETED)
            ->whereHas('ride', function ($q) use ($cutoff) {
                $q->where('status', 'completed')
                    ->where('completed_at', '<=', $cutoff);
            })
            ->where('escrow_released', false)
            ->whereDoesntHave('dispute')
            ->get();

        foreach ($payments as $payment) {
            try {
                $this->releasePayment($payment);
                $payment->update(['escrow_released' => true, 'escrow_released_at' => now()]);
                $released++;
            } catch (\Exception $e) {
                Log::error('Escrow release failed', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $released;
    }

    public function isWithinDisputeWindow(Ride $ride): bool
    {
        if (! $ride->completed_at) {
            return false;
        }

        return $ride->completed_at->diffInHours(now()) < self::DISPUTE_WINDOW_HOURS;
    }

    public function holdPendingFundsForDispute(Payment $payment): bool
    {
        if ($payment->status !== Payment::STATUS_COMPLETED || $payment->escrow_released) {
            return false;
        }

        return DB::transaction(function () use ($payment) {
            $ride = $payment->ride;
            if (! $ride || ! $ride->driver) {
                return false;
            }

            $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);
            $payoutAmount = (float) ($payment->driver_payout ?? 0);
            $pendingBalance = (float) $driverWallet->pending_balance;

            if ($pendingBalance >= $payoutAmount) {
                $driverWallet->decrement('pending_balance', $payoutAmount);
                $payment->update(['dispute_hold' => true]);

                return true;
            }

            $driverWallet->decrement('pending_balance', $pendingBalance);
            $payment->update(['dispute_hold' => true, 'dispute_hold_shortfall' => $payoutAmount - $pendingBalance]);

            return true;
        });
    }
}
