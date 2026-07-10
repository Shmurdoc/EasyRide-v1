<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DriverArrivalMonitorJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 15;

    public function __construct(
        public string $rideId,
    ) {}

    public function handle(
        NotificationService $notificationService,
    ): void {
        $ride = Ride::find($this->rideId);

        if (! $ride || $ride->isTerminal()) {
            return;
        }

        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if ($currentStatus !== RideStatus::DRIVER_EN_ROUTE->value) {
            Log::info('DriverArrivalMonitorJob: ride not in driver_en_route state', [
                'ride_id' => $this->rideId,
                'status' => $currentStatus,
            ]);

            return;
        }

        if (! $ride->driver_id) {
            return;
        }

        $elapsedMinutes = $ride->driver_notified_at
            ? now()->diffInMinutes($ride->driver_notified_at)
            : 0;

        if ($elapsedMinutes >= 15) {
            $this->handleLongDelay($ride, $notificationService);
        } elseif ($elapsedMinutes >= 8) {
            $this->handleModerateDelay($ride, $notificationService);
        } else {
            $this->delay(now()->addMinutes(5));
        }
    }

    private function handleModerateDelay(Ride $ride, NotificationService $notificationService): void
    {
        if ($ride->rider_id) {
            $notificationService->notify(
                User::find($ride->rider_id),
                'Driver Delay',
                'Your driver is running a few minutes late. Thank you for your patience.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => ['ride_id' => $ride->id, 'type' => 'driver_delay_moderate'],
                ],
            );
        }

        Log::info('DriverArrivalMonitorJob: moderate delay notification sent', [
            'ride_id' => $ride->id,
            'elapsed_minutes' => now()->diffInMinutes($ride->driver_notified_at),
        ]);
    }

    private function handleLongDelay(Ride $ride, NotificationService $notificationService): void
    {
        if ($ride->rider_id) {
            $notificationService->notify(
                User::find($ride->rider_id),
                'Long Driver Delay',
                'Your driver is significantly delayed. You may cancel this ride without charge.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => [
                        'ride_id' => $ride->id,
                        'type' => 'driver_delay_long',
                        'can_cancel_free' => true,
                    ],
                ],
            );
        }

        if ($ride->driver_id) {
            $notificationService->notify(
                User::find($ride->driver_id),
                'Arrival Reminder',
                'Please arrive at the pickup location as soon as possible.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => ['ride_id' => $ride->id, 'type' => 'arrival_reminder'],
                ],
            );
        }

        Log::info('DriverArrivalMonitorJob: long delay notification sent', [
            'ride_id' => $ride->id,
            'elapsed_minutes' => now()->diffInMinutes($ride->driver_notified_at),
        ]);
    }
}
