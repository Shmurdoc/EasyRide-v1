<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Wallet;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendLowBalanceAlertsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public float $threshold = 10.0;

    public function __construct()
    {
        $this->onQueue('notifications');
    }

    public function handle(NotificationService $notificationService): void
    {
        try {
            $lowBalanceDrivers = Wallet::where('balance', '<', $this->threshold)
                ->where('balance', '>', 0)
                ->whereHas('user', fn ($q) => $q->whereHas('driverProfile')->where('is_online', true))
                ->with('user')
                ->get();

            $alerted = 0;

            foreach ($lowBalanceDrivers as $wallet) {
                $driver = $wallet->user;

                if (! $driver || ! $driver->email) {
                    continue;
                }

                $notificationService->notify(
                    $driver,
                    'Low Wallet Balance',
                    "Your wallet balance is R{$wallet->balance}. Please top up to continue receiving rides.",
                    ['in_app' => true, 'push' => true],
                );

                $alerted++;
            }

            Log::info('SendLowBalanceAlertsJob completed', ['drivers_alerted' => $alerted]);
        } catch (\Exception $e) {
            Log::error('SendLowBalanceAlertsJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
