<?php

namespace App\Jobs;

use App\Services\WalletService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ReconcileWalletBalancesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct()
    {
        $this->onQueue('default');
    }

    public function handle(WalletService $walletService): void
    {
        try {
            $results = $walletService->reconcileAllWallets();

            Log::info('ReconcileWalletBalancesJob completed', [
                'total_wallets' => $results['total'],
                'consistent' => $results['consistent'],
                'discrepancies_found' => $results['discrepancies'],
            ]);
        } catch (\Exception $e) {
            Log::error('ReconcileWalletBalancesJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
