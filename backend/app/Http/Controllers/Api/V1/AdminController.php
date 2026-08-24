<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateSettingsRequest;
use App\Http\Responses\ApiResponse;
use App\Models\AdminAuditLog;
use App\Models\DriverPayout;
use App\Models\PoolRide;
use App\Models\Ride;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\FleetModeService;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $totalUsers = User::where('tenant_id', $tenantId)->count();
        $totalDrivers = User::where('tenant_id', $tenantId)->role('driver')->count();
        $totalRides = Ride::where('tenant_id', $tenantId)->count();
        $activeRides = Ride::where('tenant_id', $tenantId)->whereIn('status', ['searching', 'accepted', 'arrived', 'in_progress'])->count();
        $totalRevenue = Ride::where('tenant_id', $tenantId)->where('status', 'completed')->sum('total_fare');

        $ridesToday = Ride::where('tenant_id', $tenantId)->whereDate('created_at', today())->count();
        $completedToday = Ride::where('tenant_id', $tenantId)->whereDate('completed_at', today())->count();
        $revenueToday = Ride::where('tenant_id', $tenantId)->where('status', 'completed')->whereDate('completed_at', today())->sum('total_fare');

        $activePoolRides = PoolRide::whereHas('ride', fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereIn('status', ['matching', 'in_progress'])
            ->count();

        $totalPoolPassengers = PoolRide::whereHas('ride', fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereIn('status', ['matching', 'in_progress'])
            ->sum('current_passengers');

        return response()->json([
            'total_users' => $totalUsers,
            'total_drivers' => $totalDrivers,
            'total_rides' => $totalRides,
            'active_rides' => $activeRides,
            'total_revenue' => (float) $totalRevenue,
            'rides_today' => $ridesToday,
            'completed_today' => $completedToday,
            'revenue_today' => (float) $revenueToday,
            'active_pool_rides' => $activePoolRides,
            'total_pool_passengers' => (int) $totalPoolPassengers,
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $users = User::query()
            ->where('tenant_id', $tenantId)
            ->when($request->role, fn ($q, $v) => $q->where('role', $v))
            ->when($request->is_active, fn ($q, $v) => $q->where('is_active', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->search, fn ($q, $v) => $q->where(function ($qq) use ($v) {
                $escaped = addcslashes($v, '%_');
                $qq->where('name', 'like', "%{$escaped}%");
            }))
            ->with(['tenant', 'driverProfile', 'vehicle'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($users);
    }

    public function rides(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $rides = Ride::query()
            ->where('tenant_id', $tenantId)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->category, fn ($q, $v) => $q->where('category', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->with(['rider', 'driver', 'payment', 'rating'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($rides);
    }

    public function drivers(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $drivers = User::where('tenant_id', $tenantId)->role('driver')
            ->when($request->is_approved, fn ($q, $v) => $q->whereHas('driverProfile', fn ($qp) => $qp->where('is_approved', filter_var($v, FILTER_VALIDATE_BOOLEAN))))
            ->when($request->is_verified, fn ($q, $v) => $q->whereHas('driverProfile', fn ($qp) => $qp->where('is_verified', filter_var($v, FILTER_VALIDATE_BOOLEAN))))
            ->when($request->is_online, fn ($q, $v) => $q->where('is_online', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->search, fn ($q, $v) => $q->where(function ($qq) use ($v) {
                $escaped = addcslashes($v, '%_');
                $qq->where('name', 'like', "%{$escaped}%");
            }))
            ->with(['driverProfile', 'vehicle', 'tenant'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($drivers);
    }

    public function approveDriver(Request $request, User $driver): JsonResponse
    {
        if (! $driver->hasRole('driver')) {
            return ApiResponse::apiError(422, 'Invalid User', 'User is not a driver.');
        }

        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $profile = $driver->driverProfile;

        if (! $profile) {
            return ApiResponse::apiError(422, 'No Profile', 'Driver has no profile.');
        }

        $profile->update([
            'is_approved' => true,
            'is_verified' => true,
            'approved_by' => request()->user()->id,
            'approved_at' => now(),
        ]);

        AdminAuditLog::create([
            'tenant_id' => request()->user()->tenant_id,
            'user_id' => request()->user()->id,
            'action' => 'approve_driver',
            'resource_type' => 'user',
            'resource_id' => $driver->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return response()->json($profile);
    }

    public function rejectDriver(Request $request, User $driver): JsonResponse
    {
        if (! $driver->hasRole('driver')) {
            return ApiResponse::apiError(422, 'Invalid User', 'User is not a driver.');
        }

        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $profile = $driver->driverProfile;

        if ($profile) {
            $profile->update([
                'is_approved' => false,
                'is_verified' => false,
            ]);
        }

        AdminAuditLog::create([
            'tenant_id' => request()->user()->tenant_id,
            'user_id' => request()->user()->id,
            'action' => 'reject_driver',
            'resource_type' => 'user',
            'resource_id' => $driver->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return response()->json(['message' => 'Driver rejected.']);
    }

    public function updateDriverFleetType(Request $request, User $driver): JsonResponse
    {
        if (! $driver->hasRole('driver')) {
            return ApiResponse::apiError(422, 'Invalid User', 'User is not a driver.');
        }

        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validate([
            'fleet_type' => 'required|string|in:private,easyryde',
        ]);

        $profile = $driver->driverProfile;

        if (! $profile) {
            return ApiResponse::apiError(422, 'No Profile', 'Driver has no profile.');
        }

        $profile->update(['fleet_type' => $validated['fleet_type']]);

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'update_driver_fleet_type',
            'resource_type' => 'driver_profile',
            'resource_id' => $profile->id,
            'new_values' => ['fleet_type' => $validated['fleet_type']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return ApiResponse::success($driver->fresh()->load('driverProfile'));
    }

    public function settings(): JsonResponse
    {
        $settings = SystemSetting::with('tenant')
            ->when(request()->user()->tenant_id, fn ($q, $v) => $q->where('tenant_id', $v))
            ->get()
            ->keyBy('key');

        return response()->json($settings);
    }

    public function updateSettings(UpdateSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $tenantId = $request->user()->tenant_id;

        $this->guardFleetPoolChange($tenantId, $validated['key'], $validated['value'] ?? null);

        $setting = SystemSetting::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'key' => $validated['key'],
            ],
            [
                'value' => is_array($validated['value']) ? json_encode($validated['value']) : (string) $validated['value'],
                'description' => $validated['description'] ?? null,
                'type' => $validated['type'] ?? 'string',
                'options' => $validated['options'] ?? null,
            ],
        );

        app(SettingService::class)->forget($validated['key'], $tenantId);

        AdminAuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'update_settings',
            'resource_type' => 'system_setting',
            'resource_id' => $setting->id,
            'new_values' => $setting->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($setting);
    }

    private function guardFleetPoolChange(?string $tenantId, string $key, mixed $value): void
    {
        if (! in_array($key, ['rides_pool_mode', 'food_pool_mode'], true)) {
            return;
        }

        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value) || ! FleetModeService::isValidMode($value)) {
            abort(422, "Invalid fleet pool mode '{$value}'.");
        }

        $vertical = str_starts_with($key, 'rides') ? FleetModeService::VERTICAL_RIDES : FleetModeService::VERTICAL_FOOD;

        $fleetFilter = match ($value) {
            FleetModeService::MODE_EASYRYDE_ONLY => [FleetModeService::FLEET_EASYRYDE],
            FleetModeService::MODE_PRIVATE_ONLY => [FleetModeService::FLEET_PRIVATE],
            default => [FleetModeService::FLEET_EASYRYDE, FleetModeService::FLEET_PRIVATE],
        };

        $eligibleCount = User::role('driver')
            ->when($tenantId !== null, fn ($q) => $q->where('tenant_id', $tenantId))
            ->whereHas('driverProfile', function ($q) use ($fleetFilter) {
                $q->where(function ($q2) use ($fleetFilter) {
                    $q2->whereIn('fleet_type', $fleetFilter);

                    if (in_array(FleetModeService::FLEET_PRIVATE, $fleetFilter, true)) {
                        $q2->orWhereNull('fleet_type');
                    }
                })->where('is_approved', true);
            })
            ->count();

        if ($eligibleCount === 0) {
            abort(422, "Pool mode would leave zero eligible {$vertical} drivers. Aborting to prevent outage.");
        }
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $logs = AdminAuditLog::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($request->action, fn ($q, $v) => $q->where('action', $v))
            ->when($request->resource_type, fn ($q, $v) => $q->where('resource_type', $v))
            ->when($request->user_id, fn ($q, $v) => $q->where('user_id', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->with('user')
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($logs);
    }

    public function payouts(Request $request): JsonResponse
    {
        $payouts = DriverPayout::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->with('driver')
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($payouts);
    }

    public function payoutSummary(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $pending = DriverPayout::where('tenant_id', $tenantId)->where('status', 'pending')->sum('amount');
        $paidWeek = DriverPayout::where('tenant_id', $tenantId)->where('status', 'paid')
            ->whereBetween('processed_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->sum('amount');
        $paidMonth = DriverPayout::where('tenant_id', $tenantId)->where('status', 'paid')
            ->whereMonth('processed_at', now()->month)
            ->sum('amount');
        $average = DriverPayout::where('tenant_id', $tenantId)->where('status', 'paid')
            ->avg('amount') ?? 0;

        return response()->json([
            'pending' => (float) $pending,
            'paid_week' => (float) $paidWeek,
            'paid_month' => (float) $paidMonth,
            'average' => round((float) $average, 2),
        ]);
    }

    public function retryPayout(DriverPayout $payout): JsonResponse
    {
        $payout->update(['status' => 'pending']);

        AdminAuditLog::create([
            'tenant_id' => request()->user()->tenant_id,
            'user_id' => request()->user()->id,
            'action' => 'retry_payout',
            'resource_type' => 'driver_payout',
            'resource_id' => $payout->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return response()->json($payout);
    }
}
