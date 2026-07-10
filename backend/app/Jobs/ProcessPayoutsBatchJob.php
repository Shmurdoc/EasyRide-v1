<?php

namespace App\Jobs;

use App\Services\Payment\PayoutService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessPayoutsBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        public string $type = 'daily',
    ) {
        $this->onQueue('payments');
    }

    public function handle(PayoutService $payoutService): void
    {
        try {
            $count = $this->type === 'weekly'
                ? $payoutService->processWeeklyPayouts()
                : $payoutService->processDailyPayouts();

            Log::info('ProcessPayoutsBatchJob completed', [
                'type' => $this->type,
                'dispatched_count' => $count,
            ]);
        } catch (\Exception $e) {
            Log::error('ProcessPayoutsBatchJob failed', [
                'type' => $this->type,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
