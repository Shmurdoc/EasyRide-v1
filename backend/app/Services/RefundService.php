<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Payment;
use App\Models\Ride;
use Illuminate\Support\Facades\DB;

class RefundService
{
    private const FULL_REFUND_WINDOW_MINUTES = 2;

    private const BOOKING_FEE = 15.00;

    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly WalletService $walletService,
    ) {}

    public function processRefund(Ride $ride, string $reason, ?string $adminId = null): array
    {
        $payment = $ride->payment;

        if (! $payment) {
            return ['success' => false, 'error' => 'No payment found for this ride.'];
        }

        if ($payment->status === Payment::STATUS_REFUNDED) {
            return ['success' => false, 'error' => 'Payment already refunded.'];
        }

        if (! in_array($payment->status, [Payment::STATUS_COMPLETED, Payment::STATUS_PAID, Payment::STATUS_ESCROW_HELD], true)) {
            return ['success' => false, 'error' => 'Payment has not been collected and cannot be refunded.'];
        }

        $refundAmount = $this->calculateRefundAmount($ride, $reason);

        return DB::transaction(function () use ($payment, $ride, $refundAmount, $reason, $adminId) {
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();

            if (! $payment || $payment->status === Payment::STATUS_REFUNDED) {
                return ['success' => false, 'error' => 'Payment already refunded.'];
            }

            if (! in_array($payment->status, [Payment::STATUS_COMPLETED, Payment::STATUS_PAID, Payment::STATUS_ESCROW_HELD], true)) {
                return ['success' => false, 'error' => 'Payment has not been collected and cannot be refunded.'];
            }

            $payment->update([
                'status' => Payment::STATUS_REFUNDED,
                'refunded_at' => now(),
                'refund_reason' => $reason,
                'refund_amount' => $refundAmount,
                'refunded_by' => $adminId,
            ]);

            $this->reverseDriverEscrow($ride, $payment);

            if ($refundAmount > 0) {
                $this->refundToWalletOrGateway($payment, $refundAmount, $reason);
            }

            return [
                'success' => true,
                'refund_amount' => $refundAmount,
                'original_amount' => (float) $payment->amount,
                'reason' => $reason,
            ];
        });
    }

    private function reverseDriverEscrow(Ride $ride, Payment $payment): void
    {
        if (! $ride->driver) {
            return;
        }

        $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);
        $payout = (float) ($payment->driver_payout ?? 0);

        if ($driverWallet->fresh()->pending_balance > 0 && $payout > 0) {
            $driverWallet->decrement('pending_balance', min($payout, (float) $driverWallet->fresh()->pending_balance));
        }
    }

    private function refundToWalletOrGateway(Payment $payment, float $refundAmount, string $reason): void
    {
        $gateway = $payment->gateway;

        if (in_array($gateway, ['stripe', 'payfast', 'ozow'], true)) {
            $this->paymentService->refundPayment($payment, $reason);
            return;
        }

        $wallet = $this->walletService->getOrCreateWallet($payment->payer);

        $this->walletService->credit(
            $wallet,
            $refundAmount,
            'refund',
            $payment->ride_id,
            "Refund for ride {$payment->ride_id}: {$reason}",
        );
    }

    public function calculateRefundAmount(Ride $ride, string $reason): float
    {
        $payment = $ride->payment;
        $amount = (float) ($payment->amount ?? $ride->total_fare ?? 0);

        if ($amount <= 0) {
            return 0;
        }

        if ($reason === 'admin_override' || $reason === 'driver_no_show') {
            return $amount;
        }

        if ($reason === 'rider_cancelled_within_window') {
            return $amount;
        }

        if ($reason === 'rider_cancelled_after_window') {
            return round(max(0, $amount - self::BOOKING_FEE), 2);
        }

        if ($reason === 'duplicate_charge') {
            return $amount;
        }

        if ($reason === 'technical_issue') {
            return min($amount, 25.00);
        }

        return round($amount * 0.5, 2);
    }

    public function isWithinFullRefundWindow(Ride $ride): bool
    {
        if (! $ride->started_at) {
            return false;
        }

        return $ride->started_at->diffInMinutes(now()) <= self::FULL_REFUND_WINDOW_MINUTES;
    }

    public function processDriverNoShowRefund(Ride $ride): array
    {
        if (! $ride->driver) {
            return ['success' => false, 'error' => 'No driver assigned.'];
        }

        return DB::transaction(function () use ($ride) {
            $payment = $ride->payment;
            if (! $payment) {
                return ['success' => false, 'error' => 'No payment.'];
            }

            // Validate BEFORE crediting: the previous order credited the
            // driver first and returned a failure array on bad state, which
            // does not roll back — minting driver earnings from nothing on
            // already-refunded/failed payments.
            if (! in_array($payment->status, [Payment::STATUS_COMPLETED, Payment::STATUS_PAID, Payment::STATUS_ESCROW_HELD], true)) {
                return ['success' => false, 'error' => 'No collected payment to refund.'];
            }

            $this->paymentService->creditDriver($ride);

            $result = $this->processRefund($ride, 'driver_no_show');

            // processRefund runs in a savepoint; if it reports failure the
            // driver credit above must roll back too, so throw instead of
            // returning the array.
            if (! ($result['success'] ?? false)) {
                throw new \RuntimeException($result['error'] ?? 'No-show refund failed.');
            }

            return $result;
        });
    }
}
