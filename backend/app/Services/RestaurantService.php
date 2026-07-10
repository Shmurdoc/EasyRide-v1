<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\FoodOrder;
use App\Models\Restaurant;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class RestaurantService
{
    public function getNearbyRestaurants(string $tenantId, array $filters = [], int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = Restaurant::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->when($filters['cuisine'] ?? null, fn ($q, $v) => $q->where('cuisine_type', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where('name', 'like', "%{$v}%"))
            ->when($filters['featured'] ?? null, fn ($q) => $q->where('is_featured', true))
            ->when(($filters['lat'] ?? null) && ($filters['lng'] ?? null), function ($q) use ($filters) {
                $q->whereRaw(
                    '(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) <= ?',
                    [$filters['lat'], $filters['lng'], $filters['lat'], $filters['radius'] ?? 10]
                );
            })
            ->withCount('menuItems');

        $sortField = in_array($filters['sort'] ?? null, ['name', 'created_at', 'rating', 'delivery_fee']) ? $filters['sort'] : 'name';
        $sortOrder = in_array($filters['order'] ?? null, ['asc', 'desc']) ? $filters['order'] : 'asc';

        return $query->orderBy($sortField, $sortOrder)->paginate($perPage);
    }

    public function getRestaurantMenu(Restaurant $restaurant): \Illuminate\Database\Eloquent\Collection
    {
        return $restaurant->categories()
            ->where('is_active', true)
            ->with(['menuItems' => function ($q) {
                $q->where('is_active', true)->orderBy('sort_order');
            }])
            ->orderBy('sort_order')
            ->get();
    }

    public function getMenu(Restaurant $restaurant): \Illuminate\Database\Eloquent\Collection
    {
        return $restaurant->categories()
            ->where('is_active', true)
            ->with(['menuItems' => function ($q) {
                $q->where('is_active', true)
                    ->where('is_available', true)
                    ->orderBy('sort_order');
            }])
            ->orderBy('sort_order')
            ->get();
    }

    public function updateAvailability(Restaurant $restaurant, bool $isOpen): void
    {
        $restaurant->update(['is_active' => $isOpen]);

        Log::info('Restaurant availability updated', [
            'restaurant_id' => $restaurant->id,
            'is_active' => $isOpen,
        ]);
    }

    public function getOrders(Restaurant $restaurant, ?string $status = null): Collection
    {
        return FoodOrder::where('restaurant_id', $restaurant->id)
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'customer', 'driver'])
            ->latest()
            ->get();
    }
}
