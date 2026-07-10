<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\EmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendDriverEarningsSummariesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public ?string $driverId = null,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(EmailService $emailService): void
    {
        try {
            $weekStart = now()->subWeek()->startOfWeek();
            $weekEnd = now()->subWeek()->endOfWeek();

            $query = User::whereHas('driverProfile');

            if ($this->driverId) {
                $query->where('id', $this->driverId);
            }

            $query->chunk(50, function ($drivers) use ($emailService, $weekStart, $weekEnd) {
                foreach ($drivers as $driver) {
                    $this->sendSummary($driver, $emailService, $weekStart, $weekEnd);
                }
            });

            Log::info('SendDriverEarningsSummariesJob completed');
        } catch (\Exception $e) {
            Log::error('SendDriverEarningsSummariesJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function sendSummary(User $driver, EmailService $emailService, $weekStart, $weekEnd): void
    {
        $rideStats = DB::table('rides')
            ->where('driver_id', $driver->id)
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$weekStart, $weekEnd])
            ->selectRaw('COUNT(*) as total_trips, COALESCE(SUM(total_fare), 0) as total_earnings, COALESCE(AVG(total_fare), 0) as avg_per_trip')
            ->first();

        if ($rideStats->total_trips == 0) {
            return;
        }

        $onlineHours = DB::table('rides')
            ->where('driver_id', $driver->id)
            ->whereBetween('created_at', [$weekStart, $weekEnd])
            ->selectRaw('COALESCE(SUM(duration_minutes), 0) / 60.0 as online_hours')
            ->value('online_hours');

        $stats = [
            'total_earnings' => number_format($rideStats->total_earnings, 2),
            'total_trips' => $rideStats->total_trips,
            'avg_per_trip' => number_format($rideStats->avg_per_trip, 2),
            'online_hours' => number_format($onlineHours ?? 0, 1),
        ];

        $emailService->sendWeeklyEarningsReport(
            $driver->email,
            $driver->name,
            $stats,
        );

        Log::info('Weekly earnings summary sent', [
            'driver_id' => $driver->id,
            'trips' => $rideStats->total_trips,
        ]);
    }
}
