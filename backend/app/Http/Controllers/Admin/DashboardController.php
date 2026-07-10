<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DriverPayout;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $today = now()->toDateString();

        $totalUsers = User::where('tenant_id', $tenantId)->count();
        $activeDrivers = User::where('tenant_id', $tenantId)
            ->role('driver')
            ->where('is_online', true)
            ->count();

        $ridesToday = Ride::where('tenant_id', $tenantId)
            ->whereDate('created_at', $today)
            ->count();

        $revenueToday = Ride::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereDate('completed_at', $today)
            ->sum('total_fare');

        $pendingWithdrawals = DriverPayout::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->sum('amount');

        $pendingDisputes = Payment::whereHas('payer', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('dispute_hold', true)
            ->count();

        $completedToday = Ride::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereDate('completed_at', $today)
            ->count();

        $cancelledToday = Ride::where('tenant_id', $tenantId)
            ->where('status', 'cancelled')
            ->whereDate('created_at', $today)
            ->count();

        $avgFareToday = Ride::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereDate('completed_at', $today)
            ->avg('total_fare');

        $totalDrivers = User::where('tenant_id', $tenantId)->role('driver')->count();
        $totalRides = Ride::where('tenant_id', $tenantId)->count();
        $totalRevenue = Ride::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->sum('total_fare');

        return response()->json([
            'total_users' => $totalUsers,
            'total_drivers' => $totalDrivers,
            'total_rides' => $totalRides,
            'total_revenue' => (float) $totalRevenue,
            'active_drivers' => $activeDrivers,
            'rides_today' => $ridesToday,
            'revenue_today' => (float) $revenueToday,
            'pending_withdrawals' => (float) $pendingWithdrawals,
            'pending_disputes' => $pendingDisputes,
            'completed_today' => $completedToday,
            'cancelled_today' => $cancelledToday,
            'avg_fare_today' => round((float) $avgFareToday, 2),
        ]);
    }

    public function revenue(Request $request, string $period): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
        ]);

        $from = isset($validated['from'])
            ? \Carbon\Carbon::parse($validated['from'])
            : match ($period) {
                'day' => now()->subDays(30),
                'week' => now()->subWeeks(12),
                'month' => now()->subMonths(12),
                default => now()->subDays(30),
            };

        $to = isset($validated['to'])
            ? \Carbon\Carbon::parse($validated['to'])
            : now();

        $groupBy = match ($period) {
            'week' => '%x-W%v',
            'month' => 'Y-m',
            default => 'Y-m-d',
        };

        $driver = DB::connection()->getDriverName();
        $periodExpr = $driver === 'pgsql'
            ? "TO_CHAR(created_at, '{$groupBy}')"
            : "strftime('{$groupBy}', created_at)";

        $revenue = Ride::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->select(
                DB::raw("{$periodExpr} as period"),
                DB::raw('COUNT(*) as total_rides'),
                DB::raw('SUM(total_fare) as total_revenue'),
                DB::raw('AVG(total_fare) as avg_fare'),
                DB::raw('SUM(distance_km) as total_distance'),
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $totals = [
            'total_rides' => $revenue->sum('total_rides'),
            'total_revenue' => (float) $revenue->sum('total_revenue'),
            'avg_fare' => $revenue->isNotEmpty()
                ? round($revenue->avg('total_revenue') / max($revenue->avg('total_rides'), 1), 2)
                : 0,
        ];

        return response()->json([
            'period' => $period,
            'totals' => $totals,
            'breakdown' => $revenue,
        ]);
    }

    public function rides(Request $request, string $period): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
        ]);

        $from = isset($validated['from'])
            ? \Carbon\Carbon::parse($validated['from'])
            : match ($period) {
                'day' => now()->subDays(30),
                'week' => now()->subWeeks(12),
                'month' => now()->subMonths(12),
                default => now()->subDays(30),
            };

        $to = isset($validated['to'])
            ? \Carbon\Carbon::parse($validated['to'])
            : now();

        $groupBy = match ($period) {
            'week' => '%x-W%v',
            'month' => 'Y-m',
            default => 'Y-m-d',
        };

        $driver = DB::connection()->getDriverName();
        $periodExpr = $driver === 'pgsql'
            ? "TO_CHAR(created_at, '{$groupBy}')"
            : "strftime('{$groupBy}', created_at)";

        $rideStats = Ride::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->select(
                DB::raw("{$periodExpr} as period"),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
                DB::raw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled"),
                DB::raw("SUM(CASE WHEN status = 'completed' THEN total_fare ELSE 0 END) as total_revenue"),
                DB::raw("AVG(CASE WHEN status = 'completed' THEN total_fare END) as avg_fare"),
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $totals = [
            'total_rides' => $rideStats->sum('total'),
            'completed' => $rideStats->sum('completed'),
            'cancelled' => $rideStats->sum('cancelled'),
            'avg_fare' => round((float) $rideStats->avg('avg_fare'), 2),
            'completion_rate' => $rideStats->sum('total') > 0
                ? round(($rideStats->sum('completed') / $rideStats->sum('total')) * 100, 1)
                : 0,
        ];

        return response()->json([
            'period' => $period,
            'totals' => $totals,
            'breakdown' => $rideStats,
        ]);
    }
}
