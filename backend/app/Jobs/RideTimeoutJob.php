<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RideMatchingService;
use App\Services\RideStateService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RideTimeoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(
        public string $rideId,
    ) {}

    public function handle(
        RideMatchingService $rideMatchingService,
        RideStateService $rideStateService,
        NotificationService $notificationService,
    ): void {
        $ride = Ride::find($this->rideId);

        if (! $ride || $ride->isTerminal()) {
            return;
        }

        $currentStatus = $ride->status instanceof RideStatus
            ? $ride->status->value
            : $ride->status;

        if ($currentStatus !== RideStatus::SEARCHING->value) {
            Log::info('RideTimeoutJob: ride no longer searching', [
                'ride_id' => $this->rideId,
                'status' => $currentStatus,
            ]);

            return;
        }

        $radiusExpanded = $this->tryExpandRadiusAndRematch($ride, $rideMatchingService);

        if ($radiusExpanded) {
            $this->delay(now()->addMinutes(2));
            return;
        }

        $this->cancelRide($ride, $rideStateService, $notificationService);
    }

    private function tryExpandRadiusAndRematch(Ride $ride, RideMatchingService $rideMatchingService): bool
    {
        $currentRadius = (float) ($ride->search_radius_km ?? 5.0);

        if ($currentRadius >= 15.0) {
            return false;
        }

        $rideStateService = app(RideStateService::class);
        $rideStateService->expandSearchRadius($ride);

        $matched = $rideMatchingService->findAndAssignDriver($ride);

        if ($matched) {
            Log::info('RideTimeoutJob: driver found after radius expansion', [
                'ride_id' => $ride->id,
                'new_radius' => $ride->search_radius_km,
            ]);

            return true;
        }

        return true;
    }

    private function cancelRide(
        Ride $ride,
        RideStateService $rideStateService,
        NotificationService $notificationService,
    ): void {
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

            Log::info('RideTimeoutJob: ride cancelled after timeout', [
                'ride_id' => $ride->id,
            ]);
        }
    }
}
