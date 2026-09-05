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
            // Refresh under no lock first: retries after a successful release
            // must be no-ops, not exceptions that burn through tries=3 and
            // falsely flip the payment to release_failed.
            $fresh = Payment::find($this->payment->id);

            if (! $fresh || $fresh->escrow_released || $fresh->status !== Payment::STATUS_COMPLETED) {
                Log::info('Escrow release skipped (idempotent)', [
                    'payment_id' => $this->payment->id,
                    'status' => $fresh?->status,
                    'released' => $fresh?->escrow_released,
                ]);

                return;
            }

            $escrow->releasePayment($fresh);
            Log::info('Escrow released', ['payment_id' => $this->payment->id]);
        } catch (\Exception $e) {
            Log::error('Escrow release failed', [
                'payment_id' => $this->payment->id,
                'error' => $e->getMessage(),
            ]);
            if ($this->attempts() >= $this->tries) {
                // Only poison completed payments; a pending gateway payment
                // must stay pending so a late webhook can still complete it.
                Payment::where('id', $this->payment->id)
                    ->where('status', Payment::STATUS_COMPLETED)
                    ->where('escrow_released', false)
                    ->update(['status' => 'release_failed']);
            }
            throw $e;
        }
    }
}
