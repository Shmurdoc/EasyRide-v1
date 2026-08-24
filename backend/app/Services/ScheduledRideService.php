<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Ride;
use App\Models\ScheduledRide;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ScheduledRideService
{
    public function __construct(
        protected FareCalculationService $fareService,
        protected RideMatchingService $matchingService,
    ) {}

    public function scheduleRide(User $rider, array $data): ScheduledRide
    {
        $estimatedFare = $this->fareService->calculate(
            $data['pickup_latitude'],
            $data['pickup_longitude'],
            $data['dropoff_latitude'],
            $data['dropoff_longitude'],
            $data['category'] ?? 'standard',
        );

        return ScheduledRide::create([
            'rider_id' => $rider->id,
            'category' => $data['category'] ?? 'standard',
            'pickup_latitude' => $data['pickup_latitude'],
            'pickup_longitude' => $data['pickup_longitude'],
            'pickup_address' => $data['pickup_address'],
            'dropoff_latitude' => $data['dropoff_latitude'],
            'dropoff_longitude' => $data['dropoff_longitude'],
            'dropoff_address' => $data['dropoff_address'],
            'scheduled_at' => $data['scheduled_at'],
            'recurrence' => $data['recurrence'] ?? null,
            'estimated_fare' => $estimatedFare['total_fare'] ?? 0.0,
            'status' => 'pending',
        ]);
    }

    public function processScheduledRides(): int
    {
        $dispatchTime = now()->addMinutes(30);
        $windowStart = now()->addMinutes(25);
        $windowEnd = now()->addMinutes(35);

        $rides = ScheduledRide::where('status', 'pending')
            ->whereBetween('scheduled_at', [$windowStart, $windowEnd])
            ->with('rider')
            ->get();

        $dispatched = 0;

        foreach ($rides as $scheduled) {
            try {
                $ride = Ride::create([
                    'tenant_id' => $scheduled->rider->tenant_id ?? 'default',
                    'rider_id' => $scheduled->rider_id,
                    'pickup_latitude' => $scheduled->pickup_latitude,
                    'pickup_longitude' => $scheduled->pickup_longitude,
                    'pickup_address' => $scheduled->pickup_address,
                    'dropoff_latitude' => $scheduled->dropoff_latitude,
                    'dropoff_longitude' => $scheduled->dropoff_longitude,
                    'dropoff_address' => $scheduled->dropoff_address,
                    'status' => 'searching',
                    'category' => $scheduled->category,
                    'base_fare' => 25.00,
                    'per_km_fare' => 8.00,
                    'total_fare' => $scheduled->estimated_fare,
                ]);

                $scheduled->update([
                    'status' => 'dispatched',
                    'ride_id' => $ride->id,
                ]);

                $this->matchingService->findNearbyDrivers(
                    (float) $ride->pickup_latitude,
                    (float) $ride->pickup_longitude,
                    $ride->category,
                );
                $dispatched++;
            } catch (\Exception $e) {
                Log::error('Scheduled ride dispatch failed', [
                    'scheduled_id' => $scheduled->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $dispatched;
    }

    public function cancelScheduledRide(User $rider, string $scheduledId): array
    {
        $scheduled = ScheduledRide::where('id', $scheduledId)
            ->where('rider_id', $rider->id)
            ->where('status', 'pending')
            ->first();

        if (! $scheduled) {
            return ['success' => false, 'error' => 'Scheduled ride not found or cannot be cancelled.'];
        }

        $scheduled->update(['status' => 'cancelled']);

        if ($scheduled->ride_id) {
            $ride = Ride::find($scheduled->ride_id);
            if ($ride && in_array($ride->status, ['searching', 'accepted'])) {
                $ride->update(['status' => 'cancelled', 'cancelled_at' => now(), 'cancelled_by' => $rider->id]);
            }
        }

        return ['success' => true, 'message' => 'Scheduled ride cancelled.'];
    }

    public function getUpcomingRides(User $rider): array
    {
        return ScheduledRide::where('rider_id', $rider->id)
            ->where('status', 'pending')
            ->where('scheduled_at', '>', now())
            ->orderBy('scheduled_at')
            ->get()
            ->toArray();
    }
}
