<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\Ride;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentRetryService
{
    private const MAX_RETRIES = 3;

    private const RETRY_DELAYS = [2, 5, 15]; // seconds

    private const WALLET_FALLBACK_METHODS = [
        PaymentMethod::STRIPE->value,
        PaymentMethod::PAYFAST->value,
        PaymentMethod::OZOW->value,
    ];

    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly WalletService $walletService,
    ) {}

    public function processWithRetry(
        Ride $ride,
        string $method,
        array $gatewayData = [],
    ): Payment {
        $wallet = $this->walletService->getOrCreateWallet($ride->rider);
        $hasWalletFunds = $this->walletService->hasSufficientFunds($wallet, (float) $ride->total_fare);

        $lastException = null;

        for ($attempt = 1; $attempt <= self::MAX_RETRIES; $attempt++) {
            $idempotencyKey = $gatewayData['idempotency_key']
                ?? ($ride->id . '_' . $method . '_' . $attempt . '_' . Str::random(8));

            try {
                $paymentData = array_merge($gatewayData, [
                    'idempotency_key' => $idempotencyKey,
                    'attempt' => $attempt,
                ]);

                $payment = $this->paymentService->processPayment($ride, $method, $paymentData);

                if ($this->isSuccessful($payment)) {
                    Log::info('PaymentRetryService: payment succeeded', [
                        'ride_id' => $ride->id,
                        'method' => $method,
                        'attempt' => $attempt,
                        'payment_id' => $payment->id,
                    ]);

                    return $payment;
                }

                Log::warning('PaymentRetryService: payment returned non-success status', [
                    'ride_id' => $ride->id,
                    'method' => $method,
                    'attempt' => $attempt,
                    'status' => $payment->status,
                ]);

                $lastException = new \RuntimeException("Payment returned status: {$payment->status}");
            } catch (\Throwable $e) {
                $lastException = $e;

                Log::error('PaymentRetryService: attempt failed', [
                    'ride_id' => $ride->id,
                    'method' => $method,
                    'attempt' => $attempt,
                    'error' => $e->getMessage(),
                ]);
            }

            if ($attempt < self::MAX_RETRIES) {
                $delay = self::RETRY_DELAYS[$attempt - 1] ?? self::RETRY_DELAYS[array_last(self::RETRY_DELAYS)];

                Log::info('PaymentRetryService: retrying after delay', [
                    'ride_id' => $ride->id,
                    'attempt' => $attempt,
                    'delay_seconds' => $delay,
                ]);

                usleep($delay * 1_000_000);
            }
        }

        if (in_array($method, self::WALLET_FALLBACK_METHODS, true) && $hasWalletFunds) {
            Log::info('PaymentRetryService: falling back to wallet after gateway failure', [
                'ride_id' => $ride->id,
                'method' => $method,
                'total_attempts' => self::MAX_RETRIES,
            ]);

            return $this->processWithRetry($ride, PaymentMethod::WALLET->value, [
                'fallback_from' => $method,
                'fallback_reason' => $lastException?->getMessage() ?? 'Gateway payment failed after retries',
            ]);
        }

        throw new \RuntimeException(
            "Payment failed after " . self::MAX_RETRIES . " attempts for ride {$ride->id}: "
            . ($lastException?->getMessage() ?? 'Unknown error')
        );
    }

    private function isSuccessful(Payment $payment): bool
    {
        return in_array($payment->status, [
            PaymentStatus::COMPLETED->value,
            PaymentStatus::ESCROW_HELD->value,
        ], true);
    }
}
