<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Payment;
use App\Models\Ride;
use App\Models\Wallet;
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
        return DB::transaction(function () use ($ride, $method, $gatewayData) {
            Ride::where('id', $ride->id)->lockForUpdate()->first();

            $existingPayment = Payment::where('ride_id', $ride->id)
                ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_COMPLETED, Payment::STATUS_ESCROW_HELD, Payment::STATUS_PAID])
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

    /**
     * Complete a pending gateway payment once the gateway webhook confirms the
     * charge. Idempotent: if the payment is no longer pending (already captured,
     * failed, refunded), it is returned unchanged so webhook replays are safe.
     * Moves the payment to COMPLETED and escrows the driver payout in
     * pending_balance, mirroring the wallet hold path.
     */
    public function completeGatewayPayment(Payment $payment, string $reference): Payment
    {
        return DB::transaction(function () use ($payment, $reference) {
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();

            if (! $payment || $payment->status !== Payment::STATUS_PENDING) {
                return $payment;
            }

            $payment->update([
                'status' => Payment::STATUS_COMPLETED,
                'paid_at' => now(),
                'gateway_reference' => $reference,
            ]);

            $ride = $payment->ride;
            if ($ride && $ride->driver) {
                $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);
                $driverWallet->increment('pending_balance', (float) ($payment->driver_payout ?? 0));
            }

            Log::info('EscrowService: Gateway payment completed', [
                'payment_id' => $payment->id,
                'ride_id' => $payment->ride_id,
                'reference' => $reference,
            ]);

            return $payment->fresh();
        });
    }

    public function releasePayment(Payment $payment): ?WalletTransaction
    {
        return DB::transaction(function () use ($payment) {
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();

            if (! $payment || $payment->status !== Payment::STATUS_COMPLETED) {
                Log::warning('Escrow release: Payment not completed', ['payment_id' => $payment->id]);

                return null;
            }

            if ($payment->escrow_released) {
                Log::warning('Escrow release: Already released', ['payment_id' => $payment->id]);

                return null;
            }

            $ride = $payment->ride;
            if (! $ride || ! $ride->driver) {
                Log::warning('Escrow release: No driver for payment', ['payment_id' => $payment->id]);

                return null;
            }

            $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);
            $payoutAmount = (float) ($payment->driver_payout ?? 0);

            $freshDriverWallet = Wallet::where('id', $driverWallet->id)->lockForUpdate()->first();

            $pendingBalance = (float) $freshDriverWallet->pending_balance;
            if ($pendingBalance < $payoutAmount) {
                Log::warning('Escrow release: Insufficient pending balance', [
                    'pending' => $pendingBalance,
                    'payout' => $payoutAmount,
                ]);

                return null;
            }

            $freshDriverWallet->decrement('pending_balance', $payoutAmount);

            $transaction = $this->walletService->credit(
                $freshDriverWallet,
                $payoutAmount,
                'ride_earnings',
                $ride->id,
                "Escrow released for ride {$ride->id}",
            );

            $payment->update(['escrow_released' => true, 'escrow_released_at' => now()]);

            return $transaction;
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
                if ($this->releasePayment($payment) !== null) {
                    $released++;
                }
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
