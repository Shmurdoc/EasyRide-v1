<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        private readonly WalletService $walletService,
        private readonly PlatformFeeService $platformFeeService,
    ) {}

    /**
     * Process a ride payment, routing to the correct gateway based on the
     * payment method stored on the ride. Falls back to wallet for cash/wallet.
     */
    public function processRidePayment(Ride $ride): Payment
    {
        $method = $ride->payment_method ?? 'wallet';

        $methodEnum = PaymentMethod::tryFrom($method);
        if (! $methodEnum) {
            throw new \InvalidArgumentException("Invalid payment method: {$method}");
        }

        return match ($methodEnum) {
            PaymentMethod::WALLET => $this->processPayment($ride, 'wallet'),
            PaymentMethod::CASH => $this->processPayment($ride, 'cash'),
            PaymentMethod::STRIPE => $this->processPayment($ride, 'stripe'),
            PaymentMethod::PAYFAST => $this->processPayment($ride, 'payfast'),
            PaymentMethod::OZOW => $this->processPayment($ride, 'ozow'),
        };
    }

    /**
     * Core payment processor. Creates a Payment record and routes to the
     * appropriate gateway or wallet deduction.
     */
    public function processPayment(Ride $ride, string $method = 'wallet', array $gatewayData = []): Payment
    {
        $idempotencyKey = $gatewayData['idempotency_key'] ?? Str::uuid()->toString();
        $isGateway = in_array($method, ['stripe', 'payfast', 'ozow'], true);

        try {
            return DB::transaction(function () use ($ride, $method, $gatewayData, $idempotencyKey, $isGateway) {
                $existing = Payment::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    Log::info('Duplicate payment prevented by idempotency key', [
                        'idempotency_key' => $idempotencyKey,
                        'payment_id' => $existing->id,
                    ]);

                    return $existing;
                }

                // Serialize concurrent payment attempts for the same ride.
                // Without this lock two simultaneous /pay requests (or a job
                // retry racing the original) both pass the check below and
                // double-debit the rider; the DB partial unique index would
                // then surface as a raw 500 instead of an idempotent result.
                Ride::where('id', $ride->id)->lockForUpdate()->first();

                $activePayment = Payment::where('ride_id', $ride->id)
                    ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_COMPLETED, Payment::STATUS_PAID, Payment::STATUS_ESCROW_HELD])
                    ->first();

                if ($activePayment) {
                    throw new \App\Exceptions\PaymentAlreadyHeldException(
                        "Payment already exists for ride {$ride->id} with status {$activePayment->status}"
                    );
                }

                $platformFee = $this->calculatePlatformFee((float) $ride->total_fare, $ride->tenant_id);

                $driverPayout = round((float) $ride->total_fare - $platformFee, 2);
                $driverPayout = max(0, $driverPayout);

                $payment = Payment::create([
                    'ride_id' => $ride->id,
                    'payer_id' => $ride->rider_id,
                    'method' => $method,
                    'gateway' => $isGateway ? $method : 'wallet',
                    'gateway_reference' => $gatewayData['reference'] ?? null,
                    'amount' => $ride->total_fare,
                    'platform_fee' => $platformFee,
                    'driver_payout' => $driverPayout,
                    'status' => $isGateway ? Payment::STATUS_PENDING : Payment::STATUS_COMPLETED,
                    'paid_at' => $isGateway ? null : now(),
                    'gateway_response' => $gatewayData,
                    'idempotency_key' => $idempotencyKey,
                ]);

                if ($method === 'wallet') {
                    $this->walletService->debit(
                        $this->walletService->getOrCreateWallet($ride->rider),
                        (float) $ride->total_fare,
                        'payment',
                        $ride->id,
                        "Payment for ride {$ride->id}",
                    );
                }

                Log::info('Payment processed', [
                    'payment_id' => $payment->id,
                    'ride_id' => $ride->id,
                    'method' => $method,
                    'amount' => $ride->total_fare,
                    'status' => $payment->status,
                ]);

                return $payment;
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Backstop: lost the race despite the ride lock (e.g. two
            // processes inserting simultaneously hit the partial unique index
            // payments_ride_id_active_unique or the idempotency unique key).
            // Convert the raw 500 into the domain exception callers handle.
            if ($e->getCode() === '23000') {
                throw new \App\Exceptions\PaymentAlreadyHeldException(
                    "Payment already exists for ride {$ride->id} (concurrent insert)"
                );
            }

            throw $e;
        }
    }

    /**
     * Process a refund through the appropriate gateway. For wallet payments
     * the refund credits back to the wallet. For gateway payments the refund
     * is issued through the gateway API.
     */
    public function refundPayment(Payment $payment, string $reason): Payment
    {
        return DB::transaction(function () use ($payment, $reason) {
            if ($payment->status === Payment::STATUS_REFUNDED) {
                throw new \RuntimeException('Payment is already refunded.');
            }

            if ($payment->status === Payment::STATUS_FAILED) {
                throw new \RuntimeException('Cannot refund a failed payment.');
            }

            $gateway = $payment->gateway;

            if (in_array($gateway, ['stripe', 'payfast', 'ozow'], true)) {
                $this->processRefundViaGateway($payment, $reason);
            } else {
                $this->processRefundToWallet($payment, $reason);
            }

            $payment->update([
                'status' => Payment::STATUS_REFUNDED,
                'refunded_at' => now(),
                'refund_reason' => $reason,
                'refund_amount' => $payment->amount,
            ]);

            Log::info('Payment refunded', [
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
                'reason' => $reason,
                'gateway' => $gateway,
            ]);

            return $payment->fresh();
        });
    }

    /**
     * Return all available payment methods with availability status.
     */
    public function getPaymentMethods(): array
    {
        return [
            ['id' => 'wallet', 'name' => 'Wallet', 'available' => true, 'requires_redirect' => false],
            ['id' => 'cash', 'name' => 'Cash', 'available' => true, 'requires_redirect' => false],
            ['id' => 'payfast', 'name' => 'PayFast', 'available' => true, 'requires_redirect' => true],
            ['id' => 'ozow', 'name' => 'Ozow EFT', 'available' => true, 'requires_redirect' => true],
            ['id' => 'stripe', 'name' => 'Stripe Card', 'available' => true, 'requires_redirect' => false],
        ];
    }

    /**
     * Verify a payment's status with the gateway by looking up its gateway
     * reference. Returns the updated Payment model.
     */
    public function verifyPayment(string $gatewayRef): Payment
    {
        $payment = Payment::where('gateway_reference', $gatewayRef)->first();

        if (! $payment) {
            throw new \RuntimeException("No payment found with gateway reference: {$gatewayRef}");
        }

        if ($payment->status !== Payment::STATUS_PENDING) {
            return $payment;
        }

        $gateway = $payment->gateway;

        try {
            $verified = match ($gateway) {
                'stripe' => app(StripeService::class)->confirmPayment($gatewayRef),
                'payfast' => ['status' => 'pending'],
                'ozow' => ['status' => 'pending'],
                default => ['status' => 'pending'],
            };

            if (isset($verified['status']) && $verified['status'] === 'succeeded') {
                $payment->update([
                    'status' => Payment::STATUS_COMPLETED,
                    'paid_at' => now(),
                    'gateway_response' => $verified,
                ]);
            } elseif (isset($verified['status']) && in_array($verified['status'], ['failed', 'cancelled'], true)) {
                $payment->update([
                    'status' => Payment::STATUS_FAILED,
                    'gateway_response' => $verified,
                ]);
            }

            Log::info('Payment verified with gateway', [
                'payment_id' => $payment->id,
                'gateway' => $gateway,
                'gateway_ref' => $gatewayRef,
                'new_status' => $payment->fresh()->status,
            ]);
        } catch (\Exception $e) {
            Log::error('Payment verification failed', [
                'payment_id' => $payment->id,
                'gateway' => $gateway,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException("Payment verification failed: {$e->getMessage()}");
        }

        return $payment->fresh();
    }

    /**
     * Process a refund through the external gateway (Stripe only currently).
     */
    private function processRefundViaGateway(Payment $payment, string $reason): void
    {
        $gatewayRef = $payment->gateway_reference;

        if ($payment->gateway === 'stripe' && $gatewayRef) {
            try {
                app(StripeService::class)->refundPayment($gatewayRef);

                Log::info('Stripe refund processed', [
                    'payment_id' => $payment->id,
                    'gateway_ref' => $gatewayRef,
                ]);
            } catch (\Exception $e) {
                Log::error('Stripe refund failed', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);

                throw new \RuntimeException("Gateway refund failed: {$e->getMessage()}");
            }
        } else {
            Log::warning('Gateway refund not supported for method', [
                'payment_id' => $payment->id,
                'gateway' => $payment->gateway,
            ]);
        }
    }

    /**
     * Process a refund back to the rider's wallet.
     */
    private function processRefundToWallet(Payment $payment, string $reason): void
    {
        $rider = $payment->payer;

        if (! $rider) {
            throw new \RuntimeException('No payer found for payment.');
        }

        $wallet = $this->walletService->getOrCreateWallet($rider);

        $this->walletService->credit(
            $wallet,
            (float) $payment->amount,
            'refund',
            $payment->ride_id,
            "Refund for payment {$payment->id}: {$reason}",
        );
    }

    /**
     * Get paginated payment history for a user.
     */
    public function getUserPayments(User $user, array $filters = [], int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return Payment::where('payer_id', $user->id)
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['method'] ?? null, fn ($q, $v) => $q->where('method', $v))
            ->with('ride')
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Check payment velocity for fraud prevention.
     */
    public function checkPaymentVelocity(string $userId, float $rideAmount): ?array
    {
        $windowStart = now()->subHour();

        $recentCount = Payment::where('payer_id', $userId)
            ->where('created_at', '>=', $windowStart)
            ->whereIn('status', [Payment::STATUS_COMPLETED, Payment::STATUS_ESCROW_HELD])
            ->count();

        if ($recentCount >= 5) {
            return [
                'code' => 'VELOCITY_COUNT_EXCEEDED',
                'message' => 'Too many payments in the last hour. Please try again later.',
            ];
        }

        $recentAmount = (float) Payment::where('payer_id', $userId)
            ->where('created_at', '>=', $windowStart)
            ->whereIn('status', [Payment::STATUS_COMPLETED, Payment::STATUS_ESCROW_HELD])
            ->sum('amount');

        $hourlyLimit = (float) config('easyryde.payment.velocity.hourly_limit', 5000.00);
        if (($recentAmount + $rideAmount) > $hourlyLimit) {
            return [
                'code' => 'VELOCITY_AMOUNT_EXCEEDED',
                'message' => 'Hourly payment limit exceeded. Please contact support.',
            ];
        }

        return null;
    }

    public function calculatePlatformFee(float $amount, ?string $tenantId = null): float
    {
        return $this->platformFeeService->calculateFee($amount, $tenantId);
    }

    public function creditDriver(Ride $ride): WalletTransaction
    {
        return DB::transaction(function () use ($ride) {
            $wallet = $this->walletService->getOrCreateWallet($ride->driver);

            // Hold the wallet row lock across the idempotency check and the
            // credit so two concurrent callers serialize instead of both
            // passing the check and double-crediting.
            \App\Models\Wallet::where('id', $wallet->id)->lockForUpdate()->first();

            // Idempotency: retries (job redelivery, double-click, the no-show
            // refund path) must not credit the driver twice for one ride.
            $existing = WalletTransaction::where('wallet_id', $wallet->id)
                ->where('reference_type', 'ride_earnings')
                ->where('reference_id', $ride->id)
                ->first();

            if ($existing) {
                Log::info('Duplicate driver credit prevented', ['ride_id' => $ride->id]);

                return $existing;
            }

            $amount = (float) $ride->total_fare;
            $platformFee = $this->calculatePlatformFee($amount, $ride->tenant_id);
            $netAmount = $amount - $platformFee;

            return $this->walletService->credit(
                $wallet,
                $netAmount,
                'ride_earnings',
                $ride->id,
                "Earnings for ride {$ride->id} (net after fee)",
            );
        });
    }

    public function debitRider(Ride $ride): WalletTransaction
    {
        return DB::transaction(function () use ($ride) {
            $wallet = $this->walletService->getOrCreateWallet($ride->rider);

            \App\Models\Wallet::where('id', $wallet->id)->lockForUpdate()->first();

            $existing = WalletTransaction::where('wallet_id', $wallet->id)
                ->where('reference_type', 'ride_charge')
                ->where('reference_id', $ride->id)
                ->first();

            if ($existing) {
                Log::info('Duplicate rider debit prevented', ['ride_id' => $ride->id]);

                return $existing;
            }

            return $this->walletService->debit(
                $wallet,
                (float) $ride->total_fare,
                'ride_charge',
                $ride->id,
                "Charge for ride {$ride->id}",
            );
        });
    }

    /**
     * Legacy alias for refundPayment — backward compatibility.
     */
    public function processRefund(Payment $payment, string $reason = ''): Payment
    {
        return $this->refundPayment($payment, $reason);
    }
}
