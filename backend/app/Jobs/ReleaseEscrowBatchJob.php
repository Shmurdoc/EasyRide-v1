<?php

namespace App\Jobs;

use App\Services\Payment\EscrowService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ReleaseEscrowBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct()
    {
        $this->onQueue('payments');
    }

    public function handle(EscrowService $escrow): void
    {
        try {
            $count = $escrow->releaseEligiblePayments();
            Log::info('ReleaseEscrowBatchJob completed', ['dispatched_count' => $count]);
        } catch (\Exception $e) {
            Log::error('ReleaseEscrowBatchJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
