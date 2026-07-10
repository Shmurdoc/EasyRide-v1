<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateSettingsRequest;
use App\Models\AdminAuditLog;
use App\Models\DriverPayout;
use App\Models\PoolRide;
use App\Models\Ride;
use App\Models\SystemSetting;
use App\Models\User;
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
                $qq->where('name', 'like', "%{$v}%");
            }))
            ->with(['tenant', 'driverProfile', 'vehicle'])
            ->latest()
            ->paginate($request->per_page ?? 15);

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
            ->paginate($request->per_page ?? 15);

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
                $qq->where('name', 'like', "%{$v}%");
            }))
            ->with(['driverProfile', 'vehicle', 'tenant'])
            ->latest()
            ->paginate($request->per_page ?? 15);

        return response()->json($drivers);
    }

    public function approveDriver(Request $request, User $driver): JsonResponse
    {
        if (! $driver->hasRole('driver')) {
            return response()->json(['message' => 'User is not a driver.'], 422);
        }

        if ($driver->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $profile = $driver->driverProfile;

        if (! $profile) {
            return response()->json(['message' => 'Driver has no profile.'], 422);
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

    public function rejectDriver(User $driver): JsonResponse
    {
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

        $setting = SystemSetting::updateOrCreate(
            [
                'tenant_id' => $request->user()->tenant_id,
                'key' => $validated['key'],
            ],
            [
                'value' => is_array($validated['value']) ? json_encode($validated['value']) : (string) $validated['value'],
                'description' => $validated['description'] ?? null,
                'type' => $validated['type'] ?? 'string',
            ],
        );

        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
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
            ->paginate($request->per_page ?? 15);

        return response()->json($logs);
    }

    public function payouts(Request $request): JsonResponse
    {
        $payouts = DriverPayout::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->with('driver')
            ->latest()
            ->paginate($request->per_page ?? 15);

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
