<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\FoodOrderStatusUpdated;
use App\Models\FoodOrder;
use App\Models\FoodOrderItem;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FoodDeliveryService
{
    private const STATUS_FLOW = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['preparing', 'cancelled'],
        'preparing' => ['ready', 'cancelled'],
        'ready' => ['picked_up', 'cancelled'],
        'picked_up' => ['in_transit'],
        'in_transit' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];

    public function __construct(
        private readonly DriverFraudGuardService $fraudGuardService,
        private readonly FleetModeService $fleetModeService,
    ) {}

    public function isRestaurantOpen(Restaurant $restaurant): bool
    {
        if (! $restaurant->opens_at || ! $restaurant->closes_at) {
            return true;
        }

        $now = now()->format('H:i');

        return $now >= $restaurant->opens_at && $now <= $restaurant->closes_at;
    }

    public function driverAcceptOrder(FoodOrder $order, User $driver): FoodOrder
    {
        if ($order->status !== 'pending') {
            throw new \RuntimeException('Order is no longer available for acceptance.');
        }

        if ($order->driver_id !== null) {
            throw new \RuntimeException('Order already has a driver assigned.');
        }

        $order->update([
            'driver_id' => $driver->id,
            'status' => 'confirmed',
        ]);

        $driver->update(['current_ride_id' => $order->id]);

        event(new FoodOrderStatusUpdated($order));

        return $order->fresh()->load(['items', 'restaurant', 'customer']);
    }

    public function createOrder(
        Restaurant $restaurant,
        User $customer,
        array $items,
        array $deliveryData,
    ): FoodOrder {
        if (! $this->isRestaurantOpen($restaurant)) {
            throw new \RuntimeException(
                "Restaurant is closed. Hours: {$restaurant->opens_at} - {$restaurant->closes_at}"
            );
        }

        return DB::transaction(function () use ($restaurant, $customer, $items, $deliveryData) {
            $subtotal = 0;
            $orderItems = [];

            foreach ($items as $item) {
                $menuItem = MenuItem::findOrFail($item['menu_item_id']);

                if (! $menuItem->is_available || ! $menuItem->is_active) {
                    throw new \RuntimeException("Item '{$menuItem->name}' is not available.");
                }

                $quantity = $item['quantity'] ?? 1;
                $lineTotal = round((float) $menuItem->price * $quantity, 2);
                $subtotal += $lineTotal;

                $orderItems[] = [
                    'menu_item_id' => $menuItem->id,
                    'name' => $menuItem->name,
                    'price' => $menuItem->price,
                    'quantity' => $quantity,
                    'special_instructions' => $item['special_instructions'] ?? null,
                    'line_total' => $lineTotal,
                ];
            }

            if ($subtotal < (float) $restaurant->minimum_order) {
                throw new \RuntimeException(
                    "Minimum order amount is R{$restaurant->minimum_order}. Current: R{$subtotal}"
                );
            }

            $deliveryFee = (float) $restaurant->delivery_fee;
            $serviceFee = round($subtotal * 0.05, 2);
            $tipAmount = $deliveryData['tip_amount'] ?? 0;
            $totalAmount = round($subtotal + $deliveryFee + $serviceFee + $tipAmount, 2);

            $order = FoodOrder::create([
                'tenant_id' => $customer->tenant_id,
                'restaurant_id' => $restaurant->id,
                'customer_id' => $customer->id,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'service_fee' => $serviceFee,
                'tip_amount' => $tipAmount,
                'total_amount' => $totalAmount,
                'delivery_address' => $deliveryData['address'],
                'delivery_latitude' => $deliveryData['latitude'],
                'delivery_longitude' => $deliveryData['longitude'],
                'delivery_notes' => $deliveryData['notes'] ?? null,
                'payment_method' => $deliveryData['payment_method'] ?? 'cash',
                'payment_status' => 'pending',
                'estimated_delivery_at' => now()->addMinutes($restaurant->estimated_delivery_minutes),
            ]);

            foreach ($orderItems as $orderItemData) {
                FoodOrderItem::create([
                    'food_order_id' => $order->id,
                    ...$orderItemData,
                ]);
            }

            Restaurant::where('id', $restaurant->id)->increment('total_orders');

            return $order->load(['items', 'restaurant', 'customer']);
        });
    }

    public function updateStatus(FoodOrder $order, string $newStatus, ?string $reason = null, ?string $cancelledBy = null): FoodOrder
    {
        $allowed = self::STATUS_FLOW[$order->status] ?? [];
        if (! in_array($newStatus, $allowed)) {
            throw new \RuntimeException(
                "Cannot transition from '{$order->status}' to '{$newStatus}'."
            );
        }

        $updates = ['status' => $newStatus];

        if ($newStatus === 'cancelled') {
            $updates['cancelled_at'] = now();
            $updates['cancelled_by'] = $cancelledBy;
            $updates['cancellation_reason'] = $reason;
        }

        if ($newStatus === 'delivered') {
            $updates['actual_delivery_at'] = now();
        }

        $order->update($updates);

        event(new FoodOrderStatusUpdated($order));

        return $order->fresh()->load(['items', 'restaurant', 'customer', 'driver']);
    }

    public function assignDriver(FoodOrder $order, User $driver): FoodOrder
    {
        $order->update([
            'driver_id' => $driver->id,
            'status' => 'ready',
        ]);

        event(new FoodOrderStatusUpdated($order));

        return $order->fresh()->load(['items', 'restaurant', 'customer', 'driver']);
    }

    public function rateOrder(FoodOrder $order, int $rating, ?string $comment = null): FoodOrder
    {
        if ($order->status !== 'delivered') {
            throw new \RuntimeException('Can only rate delivered orders.');
        }

        if ($order->rating !== null) {
            throw new \RuntimeException('Order already rated.');
        }

        if ($rating < 1 || $rating > 5) {
            throw new \RuntimeException('Rating must be between 1 and 5.');
        }

        $order->update([
            'rating' => $rating,
            'rating_comment' => $comment,
        ]);

        $restaurant = $order->restaurant;
        $avgRating = FoodOrder::where('restaurant_id', $restaurant->id)
            ->whereNotNull('rating')
            ->avg('rating');

        $restaurant->update([
            'rating' => round((float) $avgRating, 2),
            'rating_count' => $restaurant->rating_count + 1,
        ]);

        return $order->fresh();
    }

    public function getAvailableOrders(User $driver, ?string $status = null)
    {
        if ($this->fraudGuardService->isBlockedFromAccepting($driver)) {
            return collect();
        }

        $orders = FoodOrder::whereNull('driver_id')
            ->where('status', 'pending')
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'restaurant', 'customer'])
            ->latest()
            ->get();

        return $orders->filter(fn (FoodOrder $order) => $this->fleetModeService->allows(
            $driver,
            FleetModeService::VERTICAL_FOOD,
            $order->tenant_id,
        ))->values();
    }

    public function getRestaurantOrders(Restaurant $restaurant, ?string $status = null)
    {
        return FoodOrder::where('restaurant_id', $restaurant->id)
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'customer'])
            ->latest()
            ->get();
    }

    public function getCustomerOrders(User $customer, ?string $status = null)
    {
        return FoodOrder::where('customer_id', $customer->id)
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'restaurant', 'driver'])
            ->latest()
            ->get();
    }

    public function getDriverOrders(User $driver, ?string $status = null)
    {
        return FoodOrder::where('driver_id', $driver->id)
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'restaurant', 'customer'])
            ->latest()
            ->get();
    }
}
