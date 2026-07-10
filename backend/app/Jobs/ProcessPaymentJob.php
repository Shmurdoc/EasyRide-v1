<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\PaymentStatus;
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
        if ($existingPayment && $existingPayment->status === PaymentStatus::COMPLETED->value) {
            Log::info('ProcessPaymentJob: payment already completed', [
                'ride_id' => $this->rideId,
                'payment_id' => $existingPayment->id,
            ]);

            return;
        }

        $payment = $paymentService->processPayment($ride, $this->method, $this->gatewayData);

        if ($payment->status === PaymentStatus::COMPLETED->value && $this->method !== 'wallet') {
            try {
                $escrowService->holdPayment($payment);
            } catch (\Throwable $e) {
                Log::error('ProcessPaymentJob: escrow hold failed', [
                    'ride_id' => $this->rideId,
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }
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
