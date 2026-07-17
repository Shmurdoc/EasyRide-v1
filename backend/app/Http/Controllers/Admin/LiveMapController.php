<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiveMapController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = User::where('tenant_id', $tenantId)
            ->role('driver')
            ->with(['driverProfile', 'vehicle']);

        if ($request->boolean('online_only')) {
            $query->where('is_online', true);
        }

        if ($request->filled('vehicle_type')) {
            $query->whereHas('vehicle', fn ($q) => $q->where('category', $request->vehicle_type));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        $drivers = $query->get()->map(function (User $driver) {
            $rideStatus = null;
            if ($driver->current_ride_id) {
                $ride = $driver->ridesAsDriver()
                    ->where('id', $driver->current_ride_id)
                    ->select('id', 'status')
                    ->first();
                $rideStatus = $ride?->status;
            }

            return [
                'id' => $driver->id,
                'name' => $driver->name,
                'is_online' => $driver->is_online,
                'is_active' => $driver->is_active,
                'latitude' => $driver->current_latitude ? (float) $driver->current_latitude : null,
                'longitude' => $driver->current_longitude ? (float) $driver->current_longitude : null,
                'last_location_update' => $driver->last_location_update?->toISOString(),
                'current_ride_id' => $driver->current_ride_id,
                'ride_status' => $rideStatus,
                'rating' => $driver->driverProfile
                    ? round($driver->driverProfile->average_rating, 1)
                    : null,
                'total_trips' => $driver->driverProfile?->total_trips ?? 0,
                'vehicle' => $driver->vehicle
                    ? [
                        'make' => $driver->vehicle->make,
                        'model' => $driver->vehicle->model,
                        'category' => $driver->vehicle->category,
                        'color' => $driver->vehicle->color,
                        'license_plate' => $driver->vehicle->license_plate,
                    ]
                    : null,
            ];
        });

        $onlineCount = $drivers->where('is_online', true)->count();
        $busyCount = $drivers->where('is_online', true)->where('current_ride_id', '!=', null)->count();
        $offlineCount = $drivers->where('is_online', false)->count();

        return response()->json([
            'drivers' => $drivers,
            'summary' => [
                'total' => $drivers->count(),
                'online' => $onlineCount,
                'busy' => $busyCount,
                'offline' => $offlineCount,
            ],
        ]);
    }
}
