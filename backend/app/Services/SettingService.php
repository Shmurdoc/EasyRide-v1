<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    private const TTL_SECONDS = 300;

    public function get(string $key, mixed $default = null, ?string $tenantId = null): mixed
    {
        $value = $this->remember($key, $tenantId);

        return $value ?? $default;
    }

    public function getString(string $key, string $default = '', ?string $tenantId = null): string
    {
        return (string) ($this->get($key, $default, $tenantId) ?? $default);
    }

    public function getFloat(string $key, float $default = 0.0, ?string $tenantId = null): float
    {
        return (float) ($this->get($key, $default, $tenantId) ?? $default);
    }

    public function getBool(string $key, bool $default = false, ?string $tenantId = null): bool
    {
        return (bool) ($this->get($key, $default, $tenantId) ?? $default);
    }

    public function set(string $key, mixed $value, string $type = 'string', ?string $description = null, ?string $tenantId = null): SystemSetting
    {
        $setting = SystemSetting::updateOrCreate(
            ['tenant_id' => $tenantId, 'key' => $key],
            [
                'value' => is_array($value) ? json_encode($value) : (string) $value,
                'type' => $type,
                'description' => $description,
            ],
        );

        $this->forget($key, $tenantId);

        return $setting;
    }

    public function forget(string $key, ?string $tenantId = null): void
    {
        Cache::forget($this->cacheKey($key, $tenantId));
    }

    public function forgetAll(?string $tenantId = null): void
    {
        SystemSetting::query()
            ->when($tenantId !== null, fn ($q) => $q->where('tenant_id', $tenantId))
            ->pluck('key')
            ->each(fn (string $key) => $this->forget($key, $tenantId));
    }

    private function remember(string $key, ?string $tenantId = null): mixed
    {
        return Cache::remember(
            $this->cacheKey($key, $tenantId),
            self::TTL_SECONDS,
            fn () => SystemSetting::where('key', $key)
                ->when($tenantId !== null, fn ($q) => $q->where('tenant_id', $tenantId))
                ->value('value'),
        );
    }

    private function cacheKey(string $key, ?string $tenantId = null): string
    {
        return 'setting:' . ($tenantId ?? 'platform') . ':' . $key;
    }
}