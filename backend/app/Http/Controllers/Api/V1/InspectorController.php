<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Rating;
use App\Models\Ride;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class InspectorController extends Controller
{
    public function apiStats(): JsonResponse
    {
        $hour = now()->format('Y-m-d-H');
        $prefix = 'inspector:api';

        $totalRequests = (int) Redis::get("{$prefix}:count:{$hour}") ?: 0;
        $totalTime = (float) Redis::get("{$prefix}:total_time:{$hour}") ?: 0;
        $totalErrors = (int) Redis::get("{$prefix}:errors:{$hour}") ?: 0;
        $avgResponseTime = $totalRequests > 0 ? round($totalTime / $totalRequests, 2) : 0;
        $errorRate = $totalRequests > 0 ? round(($totalErrors / $totalRequests) * 100, 2) : 0;

        $endpointKeys = Redis::keys("{$prefix}:endpoint:*:{$hour}");
        $topEndpoints = [];
        foreach ($endpointKeys as $key) {
            $parts = explode(':', str_replace("{$prefix}:endpoint:", '', $key));
            $endpoint = $parts[0];
            $count = (int) Redis::get($key) ?: 0;
            $topEndpoints[$endpoint] = $count;
        }
        arsort($topEndpoints);
        $topEndpoints = array_slice($topEndpoints, 0, 10, true);

        return response()->json([
            'data' => [
                'total_requests' => $totalRequests,
                'avg_response_time_ms' => $avgResponseTime,
                'error_count' => $totalErrors,
                'error_rate_pct' => $errorRate,
                'top_endpoints' => $topEndpoints,
                'hour' => $hour,
            ],
        ]);
    }

    public function rideFlow(): JsonResponse
    {
        $stats = [
            'searching' => Ride::where('status', 'searching')->count(),
            'accepted' => Ride::where('status', 'accepted')->count(),
            'arrived' => Ride::where('status', 'arrived')->count(),
            'in_progress' => Ride::where('status', 'in_progress')->count(),
            'completed_today' => Ride::where('status', 'completed')
                ->whereDate('completed_at', today())
                ->count(),
            'cancelled_today' => Ride::where('status', 'cancelled')
                ->whereDate('cancelled_at', today())
                ->count(),
            'total_today' => Ride::whereDate('created_at', today())->count(),
        ];

        $completedToday = Ride::where('status', 'completed')
            ->whereDate('completed_at', today())
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->get();

        $stats['avg_completion_time_minutes'] = $completedToday->count() > 0
            ? round($completedToday->avg(fn ($r) => $r->started_at->diffInSeconds($r->completed_at) / 60), 1)
            : 0;

        $stats['completion_rate_pct'] = $stats['total_today'] > 0
            ? round(($stats['completed_today'] / $stats['total_today']) * 100, 1)
            : 0;

        return response()->json(['data' => $stats]);
    }

    public function queueHealth(): JsonResponse
    {
        $queues = ['default', 'high', 'rides', 'payments', 'notifications'];
        $queueStats = [];

        foreach ($queues as $queue) {
            $size = Redis::llen("queues:{$queue}");
            $queueStats[$queue] = [
                'size' => $size,
                'status' => $size < 100 ? 'healthy' : ($size < 1000 ? 'degraded' : 'unhealthy'),
            ];
        }

        $failedJobs = DB::table('failed_jobs')->count();
        $pendingJobs = DB::table('jobs')->count();

        return response()->json([
            'data' => [
                'queues' => $queueStats,
                'failed_jobs' => $failedJobs,
                'pending_jobs' => $pendingJobs,
                'horizon_status' => class_exists('Laravel\Horizon\Horizon')
                    ? 'installed' : 'not_installed',
            ],
        ]);
    }

    public function myStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        $stats = ['role' => $role];

        if (in_array($role, ['driver', 'rider'])) {
            $rideField = $role === 'driver' ? 'driver_id' : 'rider_id';

            $stats['total_rides'] = Ride::where($rideField, $user->id)->count();
            $stats['completed_rides'] = Ride::where($rideField, $user->id)->where('status', 'completed')->count();
            $stats['cancelled_rides'] = Ride::where($rideField, $user->id)->where('status', 'cancelled')->count();
            $stats['today_rides'] = Ride::where($rideField, $user->id)->whereDate('created_at', today())->count();

            if ($role === 'driver') {
                $stats['avg_rating'] = Rating::where('ratee_id', $user->id)->avg('score');
                $stats['total_earnings'] = WalletTransaction::where('type', 'credit')
                    ->whereHas('wallet', fn ($q) => $q->where('user_id', $user->id))
                    ->sum('amount');
            }
        }

        if (in_array($role, ['admin', 'super-admin'])) {
            $stats['total_users'] = User::count();
            $stats['total_drivers'] = User::where('is_approved', true)->count();
            $stats['active_rides'] = Ride::whereIn('status', ['searching', 'accepted', 'arrived', 'in_progress'])->count();
        }

        return response()->json(['data' => $stats]);
    }
}
