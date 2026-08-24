<?php

namespace App\Jobs;

use App\Models\DriverPayout;
use App\Models\Wallet;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcessPayoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 3600;

    public function __construct(public DriverPayout $payout) {}

    public function handle(): void
    {
        try {
            $payout = DriverPayout::where('id', $this->payout->id)->first();

            if (! $payout) {
                return;
            }

            if (in_array($payout->status, ['completed', 'failed'], true)) {
                return;
            }

            if ($payout->status !== 'processing') {
                $payout->update(['status' => 'processing']);
            }

            $wallet = Wallet::where('user_id', $payout->driver_id)->lockForUpdate()->first();

            if (! $wallet) {
                Log::error('Payout failed: driver wallet not found', [
                    'payout_id' => $payout->id,
                    'driver_id' => $payout->driver_id,
                ]);
                $payout->update(['status' => 'failed', 'notes' => 'Driver wallet not found']);

                return;
            }

            if ((float) $wallet->balance < (float) $payout->amount) {
                $payout->update(['status' => 'failed', 'notes' => 'Insufficient balance']);
                return;
            }

            $wallet->decrement('balance', $payout->amount);

            $payout->update([
                'status' => 'completed',
                'reference' => 'PAY-'.strtoupper(Str::random(12)),
                'processed_at' => now(),
            ]);

            Log::info('Payout completed', ['payout_id' => $payout->id, 'driver_id' => $payout->driver_id]);
        } catch (\Exception $e) {
            Log::error('Payout failed', [
                'payout_id' => $this->payout->id,
                'error' => $e->getMessage(),
            ]);
            if ($this->attempts() >= $this->tries) {
                $this->payout->update(['status' => 'failed', 'notes' => $e->getMessage()]);
            }
            throw $e;
        }
    }
}
