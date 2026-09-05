<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Payment;
use App\Models\Ride;
use App\Services\EscrowService;
use App\Services\NotificationService;
use App\Services\PaymentService;
use App\Services\SocketService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessPaymentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public int $backoff = 60;

    public function __construct(
        public string $rideId,
        public string $method = 'wallet',
        public array $gatewayData = [],
    ) {
        $this->queue = 'horizon';
    }

    public function handle(
        PaymentService $paymentService,
        EscrowService $escrowService,
        NotificationService $notificationService,
        SocketService $socketService,
    ): void {
        $ride = Ride::find($this->rideId);

        if (! $ride) {
            Log::error('ProcessPaymentJob: ride not found', ['ride_id' => $this->rideId]);

            return;
        }

        $existingPayment = $ride->payment;
        if ($existingPayment && in_array($existingPayment->status, [
            Payment::STATUS_PENDING,
            Payment::STATUS_COMPLETED,
            Payment::STATUS_PAID,
            Payment::STATUS_ESCROW_HELD,
        ], true)) {
            Log::info('ProcessPaymentJob: payment already exists, skipping (idempotent)', [
                'ride_id' => $this->rideId,
                'payment_id' => $existingPayment->id,
                'status' => $existingPayment->status,
            ]);

            return;
        }

        // Deterministic idempotency key per ride: job retries (tries=3) must
        // not mint a fresh random key per attempt or PaymentService would
        // create a duplicate payment and double-debit the rider.
        $gatewayData = $this->gatewayData + ['idempotency_key' => "ride:{$this->rideId}:payment"];

        try {
            $payment = $this->method !== 'wallet'
                ? $escrowService->holdPayment($ride, $this->method, $gatewayData)
                : $paymentService->processPayment($ride, $this->method, $gatewayData);
        } catch (\App\Exceptions\PaymentAlreadyHeldException $e) {
            // Lost race with a concurrent worker/request: an active payment
            // now exists for this ride. Treat as success, do not retry.
            Log::info('ProcessPaymentJob: payment already held by concurrent process', [
                'ride_id' => $this->rideId,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if ($ride->rider_id) {
            $notificationService->notify(
                $ride->rider,
                'Payment Processed',
                "Your payment of R{$ride->total_fare} has been processed successfully.",
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => [
                        'ride_id' => $ride->id,
                        'payment_id' => $payment->id,
                        'type' => 'payment_processed',
                    ],
                ],
            );
        }

        $socketService->broadcastToRide($ride->id, 'payment_processed', [
            'payment_id' => $payment->id,
            'status' => $payment->status,
            'amount' => $payment->amount,
        ]);

        Log::info('ProcessPaymentJob: payment processed', [
            'ride_id' => $this->rideId,
            'payment_id' => $payment->id,
            'method' => $this->method,
            'status' => $payment->status,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessPaymentJob: permanently failed', [
            'ride_id' => $this->rideId,
            'method' => $this->method,
            'error' => $exception->getMessage(),
        ]);

        $ride = Ride::find($this->rideId);
        if ($ride && $ride->rider_id) {
            app(NotificationService::class)->notify(
                $ride->rider,
                'Payment Failed',
                'Your payment could not be processed. Please try again or contact support.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => ['ride_id' => $ride->id, 'type' => 'payment_failed'],
                ],
            );
        }
    }
}
