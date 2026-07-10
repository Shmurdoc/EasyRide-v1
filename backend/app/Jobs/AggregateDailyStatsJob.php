<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AggregateDailyStatsJob implements ShouldQueue
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
            $yesterday = now()->subDay()->startOfDay();
            $today = now()->startOfDay();

            $stats = [
                'date' => $yesterday->toDateString(),
                'total_rides' => Ride::whereBetween('created_at', [$yesterday, $today])->count(),
                'completed_rides' => Ride::where('status', 'completed')
                    ->whereBetween('completed_at', [$yesterday, $today])->count(),
                'cancelled_rides' => Ride::where('status', 'cancelled')
                    ->whereBetween('cancelled_at', [$yesterday, $today])->count(),
                'total_revenue' => (float) Payment::where('status', 'completed')
                    ->whereBetween('created_at', [$yesterday, $today])->sum('amount'),
                'platform_fees' => (float) Payment::where('status', 'completed')
                    ->whereBetween('created_at', [$yesterday, $today])->sum('platform_fee'),
                'driver_payouts_total' => (float) Payment::where('status', 'completed')
                    ->whereBetween('created_at', [$yesterday, $today])->sum('driver_payout'),
                'active_drivers' => User::whereHas('driverProfile')
                    ->where('is_online', true)->count(),
                'new_riders' => User::where('role', 'rider')
                    ->whereBetween('created_at', [$yesterday, $today])->count(),
                'new_drivers' => User::whereHas('driverProfile')
                    ->whereBetween('created_at', [$yesterday, $today])->count(),
                'avg_fare' => (float) Ride::where('status', 'completed')
                    ->whereBetween('completed_at', [$yesterday, $today])->avg('total_fare'),
            ];

            Cache::put("daily_stats:{$stats['date']}", $stats, now()->addDays(30));

            Log::info('AggregateDailyStatsJob completed', $stats);
        } catch (\Exception $e) {
            Log::error('AggregateDailyStatsJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
