<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Food\CategoryStoreRequest;
use App\Http\Requests\Api\V1\Food\MenuItemStoreRequest;
use App\Http\Requests\Api\V1\Food\MenuItemUpdateRequest;
use App\Http\Requests\Api\V1\Food\RestaurantStoreRequest;
use App\Http\Requests\Api\V1\Food\RestaurantUpdateRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FoodOrder;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodAdminController extends Controller
{
    public function restaurants(Request $request): JsonResponse
    {
        $restaurants = Restaurant::where('tenant_id', $request->user()->tenant_id)
            ->when($request->search, fn ($q, $v) => $q->where('name', 'like', "%{$v}%"))
            ->when($request->is_active, fn ($q, $v) => $q->where('is_active', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->withCount('menuItems')
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($restaurants);
    }

    public function storeRestaurant(RestaurantStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $restaurant = Restaurant::create([
            'tenant_id' => $request->user()->tenant_id,
            ...$validated,
        ]);

        return response()->json($restaurant, 201);
    }

    public function updateRestaurant(RestaurantUpdateRequest $request, Restaurant $restaurant): JsonResponse
    {
        if ($restaurant->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validated();

        $restaurant->update($validated);

        return response()->json($restaurant);
    }

    public function storeCategory(CategoryStoreRequest $request, Restaurant $restaurant): JsonResponse
    {
        if ($restaurant->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validated();

        $category = RestaurantCategory::create([
            'restaurant_id' => $restaurant->id,
            ...$validated,
        ]);

        return response()->json($category, 201);
    }

    public function storeMenuItem(MenuItemStoreRequest $request, Restaurant $restaurant): JsonResponse
    {
        if ($restaurant->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validated();

        $item = MenuItem::create([
            'restaurant_id' => $restaurant->id,
            ...$validated,
        ]);

        return response()->json($item, 201);
    }

    public function updateMenuItem(MenuItemUpdateRequest $request, MenuItem $item): JsonResponse
    {
        if ($item->restaurant->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $validated = $request->validated();

        $item->update($validated);

        return response()->json($item);
    }

    public function destroyMenuItem(Request $request, MenuItem $item): JsonResponse
    {
        if ($item->restaurant->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['super-admin'])) {
            return ApiResponse::forbidden('Unauthorized.');
        }

        $item->delete();

        return response()->json(null, 204);
    }

    public function orders(Request $request): JsonResponse
    {
        $orders = FoodOrder::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->with(['restaurant', 'customer', 'driver', 'items'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($orders);
    }
}
