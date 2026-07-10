<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class RideStateService
{
    public function __construct(
        protected CancellationService $cancellationService,
        protected NotificationService $notificationService,
    ) {}

    public function requestCancellation(Ride $ride, string $actorId, string $reason): array
    {
        if ($ride->isTerminal()) {
            return ['success' => false, 'message' => 'Ride is already completed or cancelled.'];
        }

        $actor = User::find($actorId);
        $isRider = $actor && $actor->id === $ride->rider_id;
        $isDriver = $actor && $actor->id === $ride->driver_id;

        if (! $isRider && ! $isDriver) {
            return ['success' => false, 'message' => 'Only the rider or driver can request cancellation.'];
        }

        $cancelableStates = [
            RideStatus::SEARCHING->value,
            RideStatus::DRIVER_ASSIGNED->value,
            RideStatus::ACCEPTED->value,
            RideStatus::DRIVER_EN_ROUTE->value,
            RideStatus::ARRIVED->value,
            RideStatus::WAITING_FOR_RIDER->value,
        ];

        if (! in_array($ride->status instanceof RideStatus ? $ride->status->value : $ride->status, $cancelableStates)) {
            return ['success' => false, 'message' => 'Ride cannot be cancelled at this stage.'];
        }

        $fee = $this->cancellationService->calculateFee($ride, $actorId);
        $cancellerType = $isRider ? 'rider' : 'driver';

        if ($ride->transitionTo(RideStatus::CANCELLATION_REQUESTED->value, $actorId, $reason)) {
            $ride->update([
                'cancellation_fee' => $fee['amount'],
                'cancelled_by_system' => false,
            ]);

            $this->notifyCancellationRequest($ride, $actor, $cancellerType, $fee);

            return [
                'success' => true,
                'message' => 'Cancellation request sent.',
                'fee' => $fee,
                'canceller_type' => $cancellerType,
            ];
        }

        return ['success' => false, 'message' => 'Failed to process cancellation.'];
    }

    public function confirmCancellation(Ride $ride, string $actorId): array
    {
        if ($ride->status !== RideStatus::CANCELLATION_REQUESTED) {
            return ['success' => false, 'message' => 'No pending cancellation request.'];
        }

        $actor = User::find($actorId);
        $isRider = $actor && $actor->id === $ride->rider_id;
        $isDriver = $actor && $actor->id === $ride->driver_id;

        if (! $isRider && ! $isDriver) {
            return ['success' => false, 'message' => 'Only the rider or driver can confirm cancellation.'];
        }

        $requesterId = $ride->cancelled_by;

        if ($requesterId === $actorId) {
            return ['success' => false, 'message' => 'The other party must confirm the cancellation.'];
        }

        if ($ride->transitionTo(RideStatus::CANCELLED->value, $actorId, $ride->cancellation_request_reason)) {
            $this->notifyCancellationConfirmed($ride);

            return ['success' => true, 'message' => 'Ride cancelled successfully.'];
        }

        return ['success' => false, 'message' => 'Failed to cancel ride.'];
    }

    public function rejectCancellation(Ride $ride, string $actorId): array
    {
        if ($ride->status !== RideStatus::CANCELLATION_REQUESTED) {
            return ['success' => false, 'message' => 'No pending cancellation request.'];
        }

        $actor = User::find($actorId);
        $isRider = $actor && $actor->id === $ride->rider_id;
        $isDriver = $actor && $actor->id === $ride->driver_id;

        if (! $isRider && ! $isDriver) {
            return ['success' => false, 'message' => 'Only the rider or driver can reject cancellation.'];
        }

        $requesterId = $ride->cancelled_by;

        if ($requesterId === $actorId) {
            return ['success' => false, 'message' => 'The other party must handle the cancellation request.'];
        }

        $ride->update([
            'cancellation_requested_at' => null,
            'cancellation_request_reason' => null,
            'cancellation_fee' => null,
        ]);

        $this->notifyCancellationRejected($ride);

        return ['success' => true, 'message' => 'Cancellation request rejected.'];
    }

    public function handleNoShow(Ride $ride, string $actorId): array
    {
        $noShowStates = [RideStatus::DRIVER_ASSIGNED->value, RideStatus::WAITING_FOR_RIDER->value];

        if (! in_array($ride->status instanceof RideStatus ? $ride->status->value : $ride->status, $noShowStates)) {
            return ['success' => false, 'message' => 'Ride cannot be marked as no-show.'];
        }

        $fee = $this->cancellationService->calculateFee($ride, $actorId);

        if ($ride->transitionTo(RideStatus::NO_SHOW->value, $actorId, 'rider_no_show')) {
            $ride->update([
                'cancellation_fee' => $fee['amount'],
            ]);

            $this->notifyNoShow($ride);

            return [
                'success' => true,
                'message' => 'Ride marked as no-show.',
                'fee' => $fee,
            ];
        }

        return ['success' => false, 'message' => 'Failed to mark as no-show.'];
    }

    public function expandSearchRadius(Ride $ride): void
    {
        $currentRadius = (float) ($ride->search_radius_km ?? 5.0);
        $newRadius = min($currentRadius + 2.0, 15.0);

        $ride->update(['search_radius_km' => $newRadius]);

        Log::info('Search radius expanded', [
            'ride_id' => $ride->id,
            'old_radius' => $currentRadius,
            'new_radius' => $newRadius,
        ]);
    }

    private function notifyCancellationRequest(Ride $ride, User $actor, string $cancellerType, array $fee): void
    {
        $recipientId = $cancellerType === 'rider' ? $ride->driver_id : $ride->rider_id;

        if ($recipientId) {
            $this->notificationService->notify(
                User::find($recipientId),
                'Cancellation Requested',
                ucfirst($cancellerType) . ' has requested to cancel this ride.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => [
                        'ride_id' => $ride->id,
                        'type' => 'cancellation_requested',
                        'fee' => $fee['amount'],
                    ],
                ],
            );
        }
    }

    private function notifyCancellationConfirmed(Ride $ride): void
    {
        foreach ([$ride->rider_id, $ride->driver_id] as $userId) {
            if ($userId) {
                $this->notificationService->notify(
                    User::find($userId),
                    'Ride Cancelled',
                    'This ride has been cancelled.',
                    [
                        'in_app' => true,
                        'push' => true,
                        'channel' => 'ride_updates',
                        'data' => ['ride_id' => $ride->id, 'type' => 'ride_cancelled'],
                    ],
                );
            }
        }
    }

    private function notifyCancellationRejected(Ride $ride): void
    {
        $requesterId = $ride->cancelled_by;

        if ($requesterId) {
            $this->notificationService->notify(
                User::find($requesterId),
                'Cancellation Rejected',
                'Your cancellation request was rejected. The ride continues.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => ['ride_id' => $ride->id, 'type' => 'cancellation_rejected'],
                ],
            );
        }
    }

    private function notifyNoShow(Ride $ride): void
    {
        $recipientId = $ride->driver_id ?? $ride->rider_id;

        if ($recipientId) {
            $this->notificationService->notify(
                User::find($recipientId),
                'No Show',
                'Ride marked as no-show. A fee may apply.',
                [
                    'in_app' => true,
                    'push' => true,
                    'channel' => 'ride_updates',
                    'data' => ['ride_id' => $ride->id, 'type' => 'no_show'],
                ],
            );
        }
    }
}
