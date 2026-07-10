<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;

class PlatformFeeService
{
    private const CACHE_TTL = 300; // 5 minutes

    private const DEFAULT_FEE_PERCENT = 15.0;

    private const DEFAULT_MIN_FEE = 5.0; // R5 minimum platform fee

    public function getFeePercentage(?string $tenantId = null): float
    {
        $cacheKey = "platform_fee_percent_{$tenantId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tenantId) {
            $setting = SystemSetting::where('key', 'platform_fee_percent')
                ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                ->first();

            return $setting ? (float) $setting->value : self::DEFAULT_FEE_PERCENT;
        });
    }

    public function calculateFee(float $amount, ?string $tenantId = null): float
    {
        $percent = $this->getFeePercentage($tenantId);
        $fee = round($amount * ($percent / 100), 2);

        return max($fee, self::DEFAULT_MIN_FEE);
    }

    public function setFeePercentage(float $percent, string $tenantId): void
    {
        SystemSetting::updateOrCreate(
            ['key' => 'platform_fee_percent', 'tenant_id' => $tenantId],
            ['value' => (string) $percent, 'type' => 'number', 'description' => 'Platform fee percentage']
        );

        Cache::forget("platform_fee_percent_{$tenantId}");
    }

    public function clearCache(?string $tenantId = null): void
    {
        Cache::forget("platform_fee_percent_{$tenantId}");
    }
}
