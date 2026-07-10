<?php

namespace App\Jobs;

use App\Models\Ride;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CleanupStaleRidesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct()
    {
        $this->onQueue('default');
    }

    public function handle(NotificationService $notificationService): void
    {
        try {
            $this->cancelStalePendingRides($notificationService);
            $this->cancelStaleAcceptedRides($notificationService);
        } catch (\Exception $e) {
            Log::error('CleanupStaleRidesJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function cancelStalePendingRides(NotificationService $notificationService): void
    {
        $staleRides = Ride::where('status', 'searching')
            ->where('created_at', '<', now()->subMinutes(30))
            ->get();

        $count = 0;

        foreach ($staleRides as $ride) {
            if ($ride->transitionTo('cancelled', 'system', 'Stale ride auto-cancelled after 30 minutes in searching')) {
                $notificationService->notify(
                    $ride->rider,
                    'Ride Cancelled',
                    'Your ride request was automatically cancelled because no driver was found within 30 minutes.',
                    ['type' => 'ride_cancelled', 'ride_id' => $ride->id]
                );
                $count++;
            }
        }

        Log::info('CleanupStaleRidesJob: cancelled stale pending rides', ['cancelled_count' => $count]);
    }

    private function cancelStaleAcceptedRides(NotificationService $notificationService): void
    {
        $staleRides = Ride::where('status', 'accepted')
            ->where('updated_at', '<', now()->subMinutes(15))
            ->get();

        $count = 0;

        foreach ($staleRides as $ride) {
            if ($ride->transitionTo('cancelled', 'system', 'Stale ride auto-cancelled - driver not responding after 15 minutes')) {
                $notificationService->notify(
                    $ride->rider,
                    'Ride Cancelled',
                    'Your ride was automatically cancelled because the driver did not respond within 15 minutes. Please request a new ride.',
                    ['type' => 'ride_cancelled', 'ride_id' => $ride->id]
                );

                if ($ride->driver) {
                    $notificationService->notify(
                        $ride->driver,
                        'Ride Auto-Cancelled',
                        'A ride assigned to you was automatically cancelled due to inactivity.',
                        ['type' => 'ride_cancelled', 'ride_id' => $ride->id]
                    );
                }

                $count++;
            }
        }

        Log::info('CleanupStaleRidesJob: cancelled stale accepted rides', ['cancelled_count' => $count]);
    }
}
