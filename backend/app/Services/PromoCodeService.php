<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PromoCode;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class PromoCodeService
{
    public function validateCode(string $code, ?string $tenantId = null, ?float $rideAmount = null, ?string $userId = null): PromoCode
    {
        $query = PromoCode::where('code', $code)->where('is_active', true);

        if ($tenantId !== null) {
            $query->where(fn ($q) => $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id'));
        }

        $promo = $query->first();

        if ($promo === null) {
            throw new \RuntimeException('Invalid or inactive promo code.');
        }

        if ($promo->expires_at !== null && $promo->expires_at->isPast()) {
            throw new \RuntimeException('Promo code has expired.');
        }

        if ($promo->starts_at !== null && $promo->starts_at->isFuture()) {
            throw new \RuntimeException('Promo code is not yet active.');
        }

        if ($promo->max_uses > 0 && $promo->used_count >= $promo->max_uses) {
            throw new \RuntimeException('Promo code usage limit reached.');
        }

        if ($rideAmount !== null && $promo->min_ride_amount > 0 && $rideAmount < $promo->min_ride_amount) {
            throw new \RuntimeException("Minimum ride amount of {$promo->min_ride_amount} not met.");
        }

        if ($userId !== null && $this->hasUserExceededPerUserLimit($promo, $userId)) {
            throw new \RuntimeException('You have already used this promo code the maximum number of times.');
        }

        return $promo;
    }

    public function applyDiscount(PromoCode $promo, float $rideAmount): array
    {
        $value = (float) $promo->value;
        $maxDiscount = (float) ($promo->max_discount ?? 0);
        $discount = $promo->type === 'percentage'
            ? $rideAmount * ($value / 100)
            : $value;

        if ($maxDiscount > 0 && $discount > $maxDiscount) {
            $discount = $maxDiscount;
        }

        return [
            'discount' => round($discount, 2),
            'type' => $promo->type,
        ];
    }

    public function incrementUsage(PromoCode $promo, ?string $userId = null): void
    {
        DB::transaction(function () use ($promo, $userId) {
            $lockedPromo = DB::table('promo_codes')->where('id', $promo->id)->lockForUpdate()->first();

            if (! $lockedPromo) {
                return;
            }

            if ($userId !== null) {
                $maxPerUser = (int) ($lockedPromo->max_uses_per_user ?? 1);

                $userUsageCount = DB::table('promo_code_usages')
                    ->where('promo_code_id', $promo->id)
                    ->where('user_id', $userId)
                    ->count();

                if ($userUsageCount >= $maxPerUser) {
                    throw new \RuntimeException('You have already used this promo code the maximum number of times.');
                }

                DB::table('promo_code_usages')->insert([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'promo_code_id' => $promo->id,
                    'user_id' => $userId,
                    'used_at' => now(),
                ]);
            }

            DB::table('promo_codes')
                ->where('id', $promo->id)
                ->where('used_count', '<', $lockedPromo->max_uses > 0 ? $lockedPromo->max_uses : 2147483647)
                ->update(['used_count' => DB::raw('used_count + 1')]);
        });
    }

    public function hasUserExceededPerUserLimit(PromoCode $promo, string $userId): bool
    {
        $maxPerUser = $promo->max_uses_per_user ?? 1;

        $userUsageCount = DB::table('promo_code_usages')
            ->where('promo_code_id', $promo->id)
            ->where('user_id', $userId)
            ->count();

        return $userUsageCount >= $maxPerUser;
    }

    public function getActiveCodes(?string $tenantId = null): Collection
    {
        $query = PromoCode::where('is_active', true)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn ($q) => $q->where('max_uses', 0)->orWhereColumn('used_count', '<', 'max_uses'));

        if ($tenantId !== null) {
            $query->where(fn ($q) => $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id'));
        }

        return $query->get();
    }
}
