<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RideMatchingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DriverAcceptTimeoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 15;

    public function __construct(
        public string $rideId,
        public string $driverId,
        public int $timeoutSeconds = 30,
    ) {}

    public function handle(
        RideMatchingService $rideMatchingService,
        NotificationService $notificationService,
    ): void {
        $ride = Ride::find($this->rideId);

        if (! $ride || $ride->isTerminal()) {
            return;
        }

        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if ($currentStatus !== RideStatus::DRIVER_ASSIGNED->value) {
            Log::info('DriverAcceptTimeoutJob: ride not in driver_assigned state', [
                'ride_id' => $this->rideId,
                'status' => $currentStatus,
            ]);

            return;
        }

        if ($ride->driver_id !== $this->driverId) {
            Log::info('DriverAcceptTimeoutJob: driver already changed', [
                'ride_id' => $this->rideId,
                'expected_driver' => $this->driverId,
                'actual_driver' => $ride->driver_id,
            ]);

            return;
        }

        $ride->update(['driver_id' => null, 'driver_notified_at' => null]);

        $notificationService->notify(
            User::find($this->driverId),
            'Ride Offer Expired',
            'You did not respond to the ride offer in time.',
            [
                'in_app' => true,
                'push' => true,
                'channel' => 'ride_updates',
                'data' => ['ride_id' => $ride->id, 'type' => 'offer_expired'],
            ],
        );

        $matched = $rideMatchingService->findAndAssignDriver($ride);

        if (! $matched) {
            $this->cancelRide($ride, $notificationService);
        }

        Log::info('DriverAcceptTimeoutJob: driver offer expired, reassigned or cancelled', [
            'ride_id' => $this->rideId,
            'expired_driver' => $this->driverId,
            'reassigned' => $matched,
        ]);
    }

    private function cancelRide(Ride $ride, NotificationService $notificationService): void
    {
        if ($ride->transitionTo(RideStatus::CANCELLED->value, 'system', 'timeout_no_drivers')) {
            $ride->update(['cancelled_by_system' => true]);

            if ($ride->rider_id) {
                $notificationService->notify(
                    User::find($ride->rider_id),
                    'Ride Cancelled',
                    'No drivers available. Your ride has been cancelled. Please try again.',
                    [
                        'in_app' => true,
                        'push' => true,
                        'channel' => 'ride_updates',
                        'data' => ['ride_id' => $ride->id, 'type' => 'ride_cancelled_timeout'],
                    ],
                );
            }
        }
    }
}
