<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Driver\ToggleOnlineRequest;
use App\Http\Requests\Api\V1\Driver\VehicleRegisterRequest;
use App\Http\Requests\Api\V1\Ride\UpdateLocationRequest;
use App\Http\Requests\Api\V1\UpdateDriverProfileRequest;
use App\Services\DriverService;
use App\Services\RideService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function __construct(
        protected DriverService $driverService,
        protected RideService $rideService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $drivers = $this->driverService->listDrivers(
            $request->user()->tenant_id,
            $request->only(['is_online', 'is_approved', 'search']),
            $request->per_page ?? 15,
        );

        return response()->json($drivers);
    }

    public function show(Request $request, string $driverId): JsonResponse
    {
        $driver = $this->driverService->getDriver($driverId, $request->user());

        if (! $driver) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'user' => $driver,
            'average_rating' => $driver->driverProfile?->average_rating ?? 0,
            'rating_count' => $driver->driverProfile?->rating_count ?? 0,
        ]);
    }

    public function updateProfile(UpdateDriverProfileRequest $request): JsonResponse
    {
        try {
            $profile = $this->driverService->updateDriverProfile(
                $request->user(),
                $request->validated(),
            );

            return response()->json($profile);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function registerVehicle(VehicleRegisterRequest $request): JsonResponse
    {
        $vehicle = $this->driverService->registerVehicle(
            $request->user(),
            $request->validated(),
        );

        return response()->json($vehicle, 201);
    }

    public function toggleOnline(ToggleOnlineRequest $request): JsonResponse
    {
        try {
            $result = $this->driverService->toggleOnline(
                $request->user(),
                $request->validated('is_online'),
                $request->only(['current_latitude', 'current_longitude']),
            );

            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    public function updateLocation(UpdateLocationRequest $request): JsonResponse
    {
        try {
            $this->driverService->updateLocation(
                $request->user(),
                (float) $request->validated('latitude'),
                (float) $request->validated('longitude'),
                $request->input('timestamp'),
            );

            return response()->json(['message' => 'Location updated.']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function earnings(Request $request): JsonResponse
    {
        $earnings = $this->driverService->getEarnings($request->user());

        return response()->json($earnings);
    }

    public function trips(Request $request): JsonResponse
    {
        $trips = $this->driverService->getTrips(
            $request->user(),
            $request->only(['status']),
            $request->per_page ?? 15,
        );

        return response()->json($trips);
    }

    public function stats(Request $request): JsonResponse
    {
        $stats = $this->driverService->getStats($request->user());

        return response()->json(['data' => $stats]);
    }

    public function nearbyRides(Request $request): JsonResponse
    {
        $latitude = $request->user()->current_latitude;
        $longitude = $request->user()->current_longitude;

        if (! $latitude || ! $longitude) {
            return response()->json(['message' => 'Location not set.'], 422);
        }

        $rides = $this->rideService->findNearbyRides(
            (float) $latitude,
            (float) $longitude,
            (float) ($request->radius ?? 10),
            $request->user()->tenant_id,
        );

        return response()->json($rides);
    }
}
