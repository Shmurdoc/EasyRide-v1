<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class RevokeExpiredTokensJob implements ShouldQueue
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
            $deleted = PersonalAccessToken::where('expires_at', '<', now())->delete();

            $inactive = PersonalAccessToken::whereNull('expires_at')
                ->where('created_at', '<', now()->subDays(90))
                ->delete();

            $total = $deleted + $inactive;

            Log::info('RevokeExpiredTokensJob completed', [
                'expired_tokens_revoked' => $deleted,
                'inactive_tokens_revoked' => $inactive,
                'total_revoked' => $total,
            ]);
        } catch (\Exception $e) {
            Log::error('RevokeExpiredTokensJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
