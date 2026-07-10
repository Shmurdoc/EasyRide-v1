<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
            'disk' => $this->checkDisk(),
        ];

        $healthy = ! in_array(false, array_column($checks, 'status'));

        return response()->json([
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toISOString(),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'memory_usage_mb' => round(memory_get_usage(true) / 1048576, 2),
            'uptime_seconds' => $this->getUptime(),
            'request_count_today' => $this->getRequestCountToday(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();

            return ['status' => true, 'message' => 'Database connected'];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    private function checkRedis(): array
    {
        try {
            $result = Redis::ping();
            return ['status' => true, 'message' => 'Redis connected'];
        } catch (\Exception $e) {
            try {
                $host = config('database.redis.connections.redis.host');
                $port = config('database.redis.connections.redis.port');
                $fp = @fsockopen($host, $port, $errno, $errstr, 3);
                if ($fp) {
                    fclose($fp);
                    return ['status' => true, 'message' => 'Redis reachable (TCP)'];
                }
            } catch (\Exception $e2) {}
            return ['status' => false, 'message' => 'Redis unreachable: ' . $e->getMessage()];
        }
    }

    private function checkCache(): array
    {
        try {
            $key = 'health_check_'.time();
            Cache::put($key, true, 10);
            $value = Cache::get($key);
            Cache::forget($key);

            return ['status' => $value === true, 'message' => 'Cache working'];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    private function checkQueue(): array
    {
        try {
            $size = Redis::llen('queues:default');
            return ['status' => true, 'message' => 'Queue accessible', 'size' => $size];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => 'Queue unreachable: ' . $e->getMessage()];
        }
    }

    private function checkDisk(): array
    {
        $freeSpace = disk_free_space('/');
        $totalSpace = disk_total_space('/');
        $usedPercent = 100 - ($freeSpace / $totalSpace * 100);

        return [
            'status' => $usedPercent < 90,
            'message' => sprintf('%.1f%% used', $usedPercent),
            'free_gb' => round($freeSpace / 1073741824, 2),
        ];
    }

    private function getUptime(): float
    {
        $startTime = defined('APP_START') ? APP_START : now()->subSeconds((int) (memory_get_usage() / 1000))->timestamp;

        return round(time() - $startTime, 0);
    }

    private function getRequestCountToday(): int
    {
        try {
            $hour = now()->format('Y-m-d-H');
            $prefix = 'inspector:api';
            $total = 0;

            for ($h = 0; $h <= (int) now()->format('G'); $h++) {
                $dayHour = now()->startOfDay()->addHours($h)->format('Y-m-d-H');
                $count = (int) Redis::get("{$prefix}:count:{$dayHour}");
                $total += $count;
            }

            return $total;
        } catch (\Exception $e) {
            return 0;
        }
    }
}
