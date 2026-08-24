<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\EscrowService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ReleaseEscrowJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(public Payment $payment) {}

    public function handle(EscrowService $escrow): void
    {
        try {
            $escrow->releasePayment($this->payment);
            Log::info('Escrow released', ['payment_id' => $this->payment->id]);
        } catch (\Exception $e) {
            Log::error('Escrow release failed', [
                'payment_id' => $this->payment->id,
                'error' => $e->getMessage(),
            ]);
            if ($this->attempts() >= $this->tries) {
                $this->payment->update(['status' => 'release_failed']);
            }
            throw $e;
        }
    }
}
