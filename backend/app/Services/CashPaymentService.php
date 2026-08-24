<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Payment;
use App\Models\Ride;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CashPaymentService
{
    private const PLATFORM_FEE_PERCENT = 15;

    private const RECONCILIATION_GRACE_HOURS = 48;

    public function __construct(
        private readonly WalletService $walletService,
    ) {}

    public function processCashPayment(Ride $ride): Payment
    {
        return DB::transaction(function () use ($ride) {
            if ($ride->payment) {
                throw new \RuntimeException('Payment already exists for this ride.');
            }

            $platformFee = round((float) $ride->total_fare * (self::PLATFORM_FEE_PERCENT / 100), 2);
            $driverPayout = round((float) $ride->total_fare - $platformFee, 2);

            $payment = Payment::create([
                'ride_id' => $ride->id,
                'payer_id' => $ride->rider_id,
                'payee_id' => $ride->driver_id,
                'method' => 'cash',
                'gateway' => 'cash',
                'amount' => $ride->total_fare,
                'platform_fee' => $platformFee,
                'driver_payout' => $driverPayout,
                'status' => Payment::STATUS_COMPLETED,
                'paid_at' => now(),
            ]);

            if ($ride->driver) {
                $driverWallet = $this->walletService->getOrCreateWallet($ride->driver);

                $this->walletService->debit(
                    $driverWallet,
                    $platformFee,
                    'platform_fee',
                    $ride->id,
                    "Platform fee for cash ride {$ride->id}",
                );
            }

            $this->createCashReconciliationRecord($payment);

            return $payment;
        });
    }

    public function markAsPaid(Ride $ride, float $amountReceived): array
    {
        $payment = $ride->payment;

        if (! $payment || $payment->method !== 'cash') {
            return ['success' => false, 'error' => 'Not a cash payment.'];
        }

        $expectedAmount = (float) $ride->total_fare;
        $discrepancy = round($amountReceived - $expectedAmount, 2);

        $payment->update([
            'cash_received' => $amountReceived,
            'cash_discrepancy' => $discrepancy,
            'cash_settled_at' => now(),
        ]);

        if (abs($discrepancy) > 0) {
            Log::info('Cash payment discrepancy', [
                'ride_id' => $ride->id,
                'expected' => $expectedAmount,
                'received' => $amountReceived,
                'discrepancy' => $discrepancy,
            ]);
        }

        return [
            'success' => true,
            'expected' => $expectedAmount,
            'received' => $amountReceived,
            'discrepancy' => $discrepancy,
        ];
    }

    public function getUnreconciledPayments(): iterable
    {
        return Payment::where('method', 'cash')
            ->where('status', Payment::STATUS_COMPLETED)
            ->whereNull('cash_settled_at')
            ->where('created_at', '<=', now()->subHours(self::RECONCILIATION_GRACE_HOURS))
            ->cursor();
    }

    public function reconcileOutstanding(): array
    {
        $total = 0;
        $count = 0;

        foreach ($this->getUnreconciledPayments() as $payment) {
            $payment->update([
                'cash_settled_at' => now(),
                'cash_reconciled' => true,
            ]);
            $total += (float) $payment->amount;
            $count++;
        }

        Log::info('Cash reconciliation completed', [
            'count' => $count,
            'total' => $total,
        ]);

        return ['count' => $count, 'total' => round($total, 2)];
    }

    private function createCashReconciliationRecord(Payment $payment): void
    {
        if (! $payment->payee_id) {
            return;
        }

        try {
            $ride = $payment->ride;
            $driverEarns = round((float) $payment->amount - (float) $payment->platform_fee, 2);

            DB::table('cash_reconciliations')->insert([
                'id' => (string) Str::uuid(),
                'payment_id' => $payment->id,
                'ride_id' => $payment->ride_id,
                'driver_id' => $payment->payee_id,
                'rider_id' => $payment->payer_id,
                'fare_amount' => $payment->amount,
                'platform_fee' => $payment->platform_fee,
                'driver_earns' => $driverEarns,
                'driver_marked_at' => now(),
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create cash reconciliation record', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
