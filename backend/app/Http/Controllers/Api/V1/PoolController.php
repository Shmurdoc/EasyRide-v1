<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Pool\JoinPoolRequest;
use App\Http\Requests\Api\V1\Pool\LeavePoolRequest;
use App\Models\PoolPassenger;
use App\Models\PoolRide;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PoolController extends Controller
{
    public function join(JoinPoolRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $poolRide = PoolRide::with('passengers')->findOrFail($validated['pool_ride_id']);

        if ($poolRide->status !== 'matching') {
            return response()->json([
                'success' => false,
                'message' => 'This pool ride is no longer accepting passengers.',
            ], 422);
        }

        if (! $poolRide->hasCapacity()) {
            return response()->json([
                'success' => false,
                'message' => 'This pool ride is full.',
            ], 422);
        }

        $ride = Ride::findOrFail($validated['ride_id']);

        if ($ride->rider_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You can only join a pool with your own ride.',
            ], 403);
        }

        $existingPassenger = PoolPassenger::where('pool_ride_id', $poolRide->id)
            ->where('ride_id', $ride->id)
            ->first();

        if ($existingPassenger) {
            return response()->json([
                'success' => false,
                'message' => 'You have already joined this pool ride.',
            ], 422);
        }

        $pickupOrder = $poolRide->current_passengers + 1;
        $fareShare = round($poolRide->total_fare / $poolRide->max_passengers, 2);

        DB::transaction(function () use ($poolRide, $ride, $user, $pickupOrder, $fareShare) {
            PoolPassenger::create([
                'pool_ride_id' => $poolRide->id,
                'ride_id' => $ride->id,
                'user_id' => $user->id,
                'fare_share' => $fareShare,
                'pickup_order' => $pickupOrder,
                'dropoff_order' => $pickupOrder,
                'status' => 'pending',
            ]);

            $poolRide->increment('current_passengers');
        });

        return response()->json([
            'success' => true,
            'message' => 'Successfully joined the pool ride.',
            'data' => $poolRide->fresh()->load(['passengers.user', 'driver', 'ride']),
        ], 201);
    }

    public function leave(LeavePoolRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $poolRide = PoolRide::findOrFail($validated['pool_ride_id']);

        $passenger = PoolPassenger::where('pool_ride_id', $poolRide->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $passenger) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a passenger in this pool ride.',
            ], 404);
        }

        if (in_array($passenger->status, ['picked_up', 'dropped_off'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot leave after being picked up.',
            ], 422);
        }

        DB::transaction(function () use ($passenger, $poolRide) {
            $passenger->delete();
            $poolRide->decrement('current_passengers');
        });

        return response()->json([
            'success' => true,
            'message' => 'Successfully left the pool ride.',
        ]);
    }

    public function status(Request $request, string $id): JsonResponse
    {
        $poolRide = PoolRide::with(['passengers.user', 'driver', 'ride'])
            ->findOrFail($id);

        $user = $request->user();

        $isPassenger = $poolRide->passengers->contains('user_id', $user->id);
        $isDriver = $poolRide->driver_id === $user->id;

        if (! $isPassenger && ! $isDriver && ! $user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $poolRide,
        ]);
    }

    public function matches(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pickup_lat' => 'required|numeric|between:-90,90',
            'pickup_lng' => 'required|numeric|between:-180,180',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
            'radius_km' => 'nullable|numeric|min:0.5|max:20',
        ]);

        $radius = $validated['radius_km'] ?? 5;

        $poolRides = PoolRide::where('status', 'matching')
            ->whereHas('ride', function ($q) use ($validated, $radius) {
                $q->whereRaw(
                    '(6371 * acos(cos(radians(?)) * cos(radians(pickup_latitude)) * cos(radians(pickup_longitude) - radians(?)) + sin(radians(?)) * sin(radians(pickup_latitude)))) <= ?',
                    [$validated['pickup_lat'], $validated['pickup_lng'], $validated['pickup_lat'], $radius]
                );
            })
            ->with(['ride', 'driver', 'passengers'])
            ->get()
            ->filter(fn ($pool) => $pool->hasCapacity())
            ->values();

        return response()->json([
            'success' => true,
            'data' => $poolRides,
        ]);
    }

    public function driverPassengers(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $poolRide = PoolRide::with(['passengers.user', 'passengers.ride'])->findOrFail($id);

        if ($poolRide->driver_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $poolRide->passengers,
        ]);
    }

    public function markPickup(Request $request, string $id, string $passengerId): JsonResponse
    {
        $user = $request->user();
        $poolRide = PoolRide::findOrFail($id);

        if ($poolRide->driver_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $passenger = PoolPassenger::where('pool_ride_id', $id)
            ->where('id', $passengerId)
            ->firstOrFail();

        if ($passenger->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Passenger is not in pending status.',
            ], 422);
        }

        $passenger->update(['status' => 'picked_up']);

        return response()->json([
            'success' => true,
            'message' => 'Passenger marked as picked up.',
            'data' => $passenger->fresh()->load('user'),
        ]);
    }

    public function markDropoff(Request $request, string $id, string $passengerId): JsonResponse
    {
        $user = $request->user();
        $poolRide = PoolRide::findOrFail($id);

        if ($poolRide->driver_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $passenger = PoolPassenger::where('pool_ride_id', $id)
            ->where('id', $passengerId)
            ->firstOrFail();

        if ($passenger->status !== 'picked_up') {
            return response()->json([
                'success' => false,
                'message' => 'Passenger has not been picked up yet.',
            ], 422);
        }

        $passenger->update(['status' => 'dropped_off']);

        $allDroppedOff = $poolRide->passengers()->where('status', '!=', 'dropped_off')->count() === 0;

        if ($allDroppedOff) {
            $poolRide->update(['status' => 'completed']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Passenger marked as dropped off.',
            'data' => $passenger->fresh()->load('user'),
        ]);
    }
}
