<?php

namespace App\Jobs;

use App\Models\PromoCode;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExpirePromoCodesJob implements ShouldQueue
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
            $expired = PromoCode::where('is_active', true)
                ->where('expires_at', '<=', now())
                ->update(['is_active' => false]);

            $exhausted = PromoCode::where('is_active', true)
                ->where('max_uses', '>', 0)
                ->whereColumn('used_count', '>=', 'max_uses')
                ->update(['is_active' => false]);

            $total = $expired + $exhausted;

            Log::info('ExpirePromoCodesJob completed', [
                'expired_by_date' => $expired,
                'expired_by_usage' => $exhausted,
                'total_deactivated' => $total,
            ]);
        } catch (\Exception $e) {
            Log::error('ExpirePromoCodesJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
