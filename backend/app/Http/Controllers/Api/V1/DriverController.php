<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Driver\ToggleOnlineRequest;
use App\Http\Requests\Api\V1\Driver\VehicleRegisterRequest;
use App\Http\Requests\Api\V1\Ride\UpdateLocationRequest;
use App\Http\Requests\Api\V1\UpdateDriverProfileRequest;
use App\Http\Responses\ApiResponse;
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

        return ApiResponse::paginated($drivers);
    }

    public function show(Request $request, string $driverId): JsonResponse
    {
        $driver = $this->driverService->getDriver($driverId, $request->user());

        if (! $driver) {
            return ApiResponse::forbidden();
        }

        return ApiResponse::success([
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

            return ApiResponse::success($profile);
        } catch (\RuntimeException $e) {
            return ApiResponse::apiError(422, 'Update Failed', $e->getMessage());
        }
    }

    public function registerVehicle(VehicleRegisterRequest $request): JsonResponse
    {
        $vehicle = $this->driverService->registerVehicle(
            $request->user(),
            $request->validated(),
        );

        return ApiResponse::success($vehicle, 'Vehicle registered.', 201);
    }

    public function toggleOnline(ToggleOnlineRequest $request): JsonResponse
    {
        try {
            $result = $this->driverService->toggleOnline(
                $request->user(),
                $request->validated('is_online'),
                $request->only(['current_latitude', 'current_longitude']),
            );

            return ApiResponse::success($result);
        } catch (\RuntimeException $e) {
            return ApiResponse::forbidden($e->getMessage());
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

            return ApiResponse::success(null, 'Location updated.');
        } catch (\RuntimeException $e) {
            return ApiResponse::apiError(422, 'Update Failed', $e->getMessage());
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

        return ApiResponse::paginated($trips);
    }

    public function stats(Request $request): JsonResponse
    {
        $stats = $this->driverService->getStats($request->user());

        return ApiResponse::success($stats);
    }

    public function nearbyRides(Request $request): JsonResponse
    {
        $latitude = $request->user()->current_latitude;
        $longitude = $request->user()->current_longitude;

        if (! $latitude || ! $longitude) {
            return ApiResponse::apiError(422, 'Location Required', 'Location not set.');
        }

        $rides = $this->rideService->findNearbyRides(
            (float) $latitude,
            (float) $longitude,
            (float) ($request->radius ?? 10),
            $request->user()->tenant_id,
        );

        return ApiResponse::success($rides);
    }
}
