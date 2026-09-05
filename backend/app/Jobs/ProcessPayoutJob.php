<?php

namespace App\Jobs;

use App\Models\DriverPayout;
use App\Models\Wallet;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcessPayoutJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 3600;

    /**
     * Terminal statuses the worker must never debit. 'paid'/'rejected'
     * belong to the admin external-fulfilment flow (Admin\WalletController)
     * which moves no wallet money; debiting those would pay out twice.
     * 'pending'/'approved'/'processing' are claimed atomically below.
     */
    private const TERMINAL_STATUSES = ['completed', 'failed', 'paid', 'rejected'];

    public function __construct(public DriverPayout $payout) {}

    public function handle(): void
    {
        try {
            DB::transaction(function () {
                // Row lock MUST be inside the transaction. The previous code
                // called lockForUpdate() outside any transaction, so the lock
                // released immediately and concurrent workers/retries could
                // both pass the status check and debit the wallet twice.
                $payout = DriverPayout::where('id', $this->payout->id)->lockForUpdate()->first();

                if (! $payout) {
                    return;
                }

                if (in_array($payout->status, self::TERMINAL_STATUSES, true)) {
                    return;
                }

                // Ledger-level idempotency: a previous attempt may have
                // debited and committed (status update lost only if the
                // commit itself failed, which rolls back the debit too — but
                // belt-and-braces against operator requeue of stale rows).
                $alreadyDebited = DB::table('wallet_transactions')
                    ->where('reference_type', 'payout')
                    ->where('reference_id', $payout->id)
                    ->exists();

                if ($alreadyDebited) {
                    $payout->update(['status' => 'completed', 'processed_at' => $payout->processed_at ?? now()]);

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

                $balanceBefore = (float) $wallet->balance;
                $wallet->decrement('balance', $payout->amount);

                /** @var array<string, mixed> $entry */
                $entry = [
                    'type' => 'debit',
                    'amount' => $payout->amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => (float) $wallet->fresh()->balance,
                    'reference_type' => 'payout',
                    'reference_id' => $payout->id,
                    'description' => "Driver payout {$payout->id}",
                ];
                $wallet->transactions()->create($entry);

                // Stable reference: previously regenerated on every retry,
                // making reconciliation ambiguous. Only set once.
                $payout->update([
                    'status' => 'completed',
                    'reference' => $payout->reference ?? 'PAY-'.strtoupper(Str::random(12)),
                    'processed_at' => now(),
                ]);

                Log::info('Payout completed', ['payout_id' => $payout->id, 'driver_id' => $payout->driver_id]);
            });
        } catch (\Exception $e) {
            Log::error('Payout failed', [
                'payout_id' => $this->payout->id,
                'error' => $e->getMessage(),
            ]);
            if ($this->attempts() >= $this->tries) {
                // Never clobber terminal states — keep in sync with TERMINAL_STATUSES.
                DriverPayout::where('id', $this->payout->id)
                    ->whereNotIn('status', self::TERMINAL_STATUSES)
                    ->update(['status' => 'failed', 'notes' => $e->getMessage()]);
            }
            throw $e;
        }
    }
}
