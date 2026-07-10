<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Food\FoodAssignDriverRequest;
use App\Http\Requests\Api\V1\Food\FoodOrderCancelRequest;
use App\Http\Requests\Api\V1\Food\FoodOrderCreateRequest;
use App\Http\Requests\Api\V1\Food\FoodOrderRateRequest;
use App\Http\Requests\Api\V1\Food\FoodUpdateStatusRequest;
use App\Models\FoodOrder;
use App\Models\Restaurant;
use App\Models\User;
use App\Services\FoodDeliveryService;
use App\Services\FoodOrderService;
use App\Services\RestaurantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodDeliveryController extends Controller
{
    public function __construct(
        protected FoodDeliveryService $foodDeliveryService,
        protected FoodOrderService $foodOrderService,
        protected RestaurantService $restaurantService,
    ) {}

    public function restaurants(Request $request): JsonResponse
    {
        $restaurants = $this->restaurantService->getNearbyRestaurants(
            $request->user()->tenant_id,
            $request->only(['lat', 'lng', 'radius', 'cuisine', 'search', 'featured', 'sort', 'order']),
            $request->per_page ?? 15,
        );

        return response()->json($restaurants);
    }

    public function show(Request $request, Restaurant $restaurant): JsonResponse
    {
        if ($restaurant->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(
            $restaurant->load(['categories.menuItems' => function ($q) {
                $q->where('is_active', true)->where('is_available', true)->orderBy('sort_order');
            }])
        );
    }

    public function menu(Request $request, Restaurant $restaurant): JsonResponse
    {
        if ($restaurant->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $menu = $this->restaurantService->getRestaurantMenu($restaurant);

        return response()->json($menu);
    }

    public function createOrder(FoodOrderCreateRequest $request, Restaurant $restaurant): JsonResponse
    {
        try {
            $order = $this->foodOrderService->createOrder(
                $restaurant,
                $request->user(),
                $request->validated('items'),
                [
                    'address' => $request->validated('delivery_address'),
                    'latitude' => $request->validated('delivery_lat'),
                    'longitude' => $request->validated('delivery_lng'),
                    'notes' => $request->validated('notes'),
                    'payment_method' => $request->validated('payment_method'),
                    'tip_amount' => $request->validated('tip_amount') ?? 0,
                ],
            );

            return response()->json($order, 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function showOrder(Request $request, FoodOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id
            && $order->driver_id !== $request->user()->id
            && ! $request->user()->hasAnyRole(['admin', 'super-admin'])
        ) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(
            $order->load(['items', 'restaurant', 'customer', 'driver'])
        );
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = $this->foodOrderService->getCustomerOrders(
            $request->user(),
            $request->status,
        );

        return response()->json($orders);
    }

    public function cancelOrder(FoodOrderCancelRequest $request, FoodOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $order = $this->foodOrderService->cancelOrder(
                $order,
                $request->user()->id,
                $request->validated('reason') ?? 'Cancelled by customer',
            );

            return response()->json($order);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function rateOrder(FoodOrderRateRequest $request, FoodOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $order = $this->foodOrderService->rateOrder(
                $order,
                $request->validated('rating'),
                $request->validated('comment'),
            );

            return response()->json($order);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function driverOrders(Request $request): JsonResponse
    {
        $orders = $this->foodOrderService->getDriverOrders(
            $request->user(),
            $request->status,
        );

        return response()->json($orders);
    }

    public function availableOrders(Request $request): JsonResponse
    {
        $orders = $this->foodOrderService->getAvailableOrders(
            $request->user(),
            $request->status,
        );

        return response()->json($orders);
    }

    public function driverAcceptOrder(Request $request, FoodOrder $order): JsonResponse
    {
        try {
            $order = $this->foodOrderService->acceptOrder($order, $request->user());

            return response()->json($order);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function restaurantOrders(Request $request): JsonResponse
    {
        $restaurantIds = Restaurant::where('tenant_id', $request->user()->tenant_id)
            ->pluck('id');

        if ($restaurantIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $orders = $this->foodOrderService->getRestaurantOrders(
            $restaurantIds,
            $request->only(['status']),
            $request->per_page ?? 15,
        );

        return response()->json($orders);
    }

    public function assignDriver(FoodAssignDriverRequest $request, FoodOrder $order): JsonResponse
    {
        $driver = User::findOrFail($request->validated('driver_id'));

        try {
            $order = $this->foodOrderService->assignDriver($order, $driver);

            return response()->json($order);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function updateStatus(FoodUpdateStatusRequest $request, FoodOrder $order): JsonResponse
    {
        try {
            $order = $this->foodOrderService->updateOrderStatus(
                $order,
                $request->validated('status'),
                $request->input('reason'),
            );

            return response()->json($order);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
