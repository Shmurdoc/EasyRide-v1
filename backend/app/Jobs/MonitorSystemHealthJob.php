<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class MonitorSystemHealthJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct()
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        try {
            $health = [
                'timestamp' => now()->toIso8601String(),
                'database' => $this->checkDatabase(),
                'redis' => $this->checkRedis(),
                'queue' => $this->checkQueueSizes(),
            ];

            Cache::put('system_health', $health, now()->addMinutes(35));

            $issues = array_filter($health, fn ($v) => is_array($v) && ($v['status'] ?? '') === 'unhealthy');

            if (! empty($issues)) {
                Log::warning('System health issues detected', $issues);
            } else {
                Log::info('System health check passed', $health);
            }
        } catch (\Exception $e) {
            Log::error('MonitorSystemHealthJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            DB::connection()->getPdo();
            $latency = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $latency < 500 ? 'healthy' : 'degraded',
                'latency_ms' => $latency,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkRedis(): array
    {
        try {
            $start = microtime(true);
            Redis::ping();
            $latency = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $latency < 100 ? 'healthy' : 'degraded',
                'latency_ms' => $latency,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkQueueSizes(): array
    {
        $queues = ['default', 'high', 'rides', 'payments', 'notifications'];
        $sizes = [];

        foreach ($queues as $queue) {
            $sizes[$queue] = Redis::llen("queues:{$queue}");
        }

        $total = array_sum($sizes);

        return [
            'status' => $total < 1000 ? 'healthy' : ($total < 5000 ? 'degraded' : 'unhealthy'),
            'sizes' => $sizes,
            'total_pending' => $total,
        ];
    }
}
