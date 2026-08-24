<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\FoodOrderStatusUpdated;
use App\Models\DriverViolation;
use App\Models\FoodOrder;
use App\Models\FoodOrderItem;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FoodOrderService
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

    private ?DriverViolation $lastViolation = null;

    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly WalletService $walletService,
        private readonly DriverFraudGuardService $fraudGuardService,
        private readonly FleetModeService $fleetModeService,
    ) {}

    public function lastViolation(): ?DriverViolation
    {
        return $this->lastViolation;
    }

    public function createOrder(Restaurant $restaurant, User $customer, array $items, array $deliveryData): FoodOrder
    {
        if (! $restaurant->is_active) {
            throw new \RuntimeException('Restaurant is not available.');
        }

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

                if ($menuItem->restaurant_id !== $restaurant->id) {
                    throw new \RuntimeException("Item '{$menuItem->name}' does not belong to this restaurant.");
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

            Log::info('Food order created', [
                'order_id' => $order->id,
                'restaurant_id' => $restaurant->id,
                'customer_id' => $customer->id,
                'total_amount' => $totalAmount,
            ]);

            return $order->load(['items', 'restaurant', 'customer']);
        });
    }

    public function assignDriver(FoodOrder $order, User $driver): FoodOrder
    {
        if ($order->driver_id !== null) {
            throw new \RuntimeException('Order already has a driver assigned.');
        }

        if (! in_array($order->status, ['confirmed', 'ready'])) {
            throw new \RuntimeException('Order cannot be assigned in current status.');
        }

        return DB::transaction(function () use ($order, $driver) {
            $order->update([
                'driver_id' => $driver->id,
                'status' => 'picked_up',
            ]);

            $driver->update(['current_ride_id' => $order->id]);

            event(new FoodOrderStatusUpdated($order));

            Log::info('Driver assigned to food order', [
                'order_id' => $order->id,
                'driver_id' => $driver->id,
            ]);

            return $order->fresh()->load(['items', 'restaurant', 'customer', 'driver']);
        });
    }

    public function acceptOrder(FoodOrder $order, User $driver): FoodOrder
    {
        if ($order->driver_id !== null) {
            throw new \RuntimeException('Order already has a driver assigned.');
        }

        return DB::transaction(function () use ($order, $driver) {
            $order->update([
                'driver_id' => $driver->id,
                'status' => 'confirmed',
            ]);

            $driver->update(['current_ride_id' => $order->id]);

            event(new FoodOrderStatusUpdated($order));

            Log::info('Driver accepted food order', [
                'order_id' => $order->id,
                'driver_id' => $driver->id,
            ]);

            return $order->fresh()->load(['items', 'restaurant', 'customer', 'driver']);
        });
    }

    public function updateOrderStatus(FoodOrder $order, string $status, ?string $reason = null): FoodOrder
    {
        $allowed = self::STATUS_FLOW[$order->status] ?? [];
        if (! in_array($status, $allowed)) {
            throw new \RuntimeException(
                "Cannot transition from '{$order->status}' to '{$status}'."
            );
        }

        $updates = ['status' => $status];

        if ($status === 'cancelled') {
            $updates['cancelled_at'] = now();
            if ($reason) {
                $updates['cancellation_reason'] = $reason;
            }
        }

        if ($status === 'delivered') {
            $updates['actual_delivery_at'] = now();

            if ($order->driver_id) {
                $this->creditDriverEarnings($order);
            }
        }

        $order->update($updates);

        event(new FoodOrderStatusUpdated($order));

        Log::info('Food order status updated', [
            'order_id' => $order->id,
            'status' => $status,
        ]);

        return $order->fresh()->load(['items', 'restaurant', 'customer', 'driver']);
    }

    public function cancelOrder(FoodOrder $order, string $cancelledBy, string $reason = '', array $allowedStatuses = ['pending', 'confirmed']): FoodOrder
    {
        if (! in_array($order->status, $allowedStatuses, true)) {
            throw new \RuntimeException('Order cannot be cancelled at this stage.');
        }

        return DB::transaction(function () use ($order, $cancelledBy, $reason) {
            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => $cancelledBy,
                'cancellation_reason' => $reason,
            ]);

            if ($order->payment_status === 'paid') {
                $this->processRefund($order);
            }

            if ($order->driver_id) {
                User::where('id', $order->driver_id)
                    ->update(['current_ride_id' => null]);
            }

            event(new FoodOrderStatusUpdated($order));

            Log::info('Food order cancelled', [
                'order_id' => $order->id,
                'reason' => $reason,
            ]);

            return $order->fresh()->load(['items', 'restaurant', 'customer', 'driver']);
        });
    }

    /**
     * Driver-initiated cancel — engine parity with ride R-P1/R-P2 sanctions.
     * Pre-pickup cancels are allowed (no fine); post-pickup or near-dropoff
     * cancels trigger the conduct engine.
     */
    public function driverCancelOrder(FoodOrder $order, User $driver, string $reason = ''): FoodOrder
    {
        if (! in_array($order->status, ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'], true)) {
            throw new \RuntimeException('Order cannot be cancelled by driver at this stage.');
        }

        if ($order->driver_id !== $driver->id) {
            throw new \RuntimeException('Only the assigned driver can cancel this order.');
        }

        $this->lastViolation = null;

        $priorStatus = $order->status;

        $cancelled = $this->cancelOrder(
            $order,
            (string) $driver->id,
            $reason,
            ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'],
        );

        $this->lastViolation = $this->fraudGuardService->evaluateFoodCancellation(
            $order->fresh(),
            $driver,
            $reason,
            $priorStatus,
        );

        return $cancelled;
    }

    public function rateOrder(FoodOrder $order, int $rating, ?string $comment = null): FoodOrder
    {
        if ($order->status !== 'delivered') {
            throw new \RuntimeException('Order must be delivered before rating.');
        }

        $order->update([
            'rating' => $rating,
            'rating_comment' => $comment,
        ]);

        Log::info('Food order rated', [
            'order_id' => $order->id,
            'rating' => $rating,
        ]);

        return $order->fresh();
    }

    public function getCustomerOrders(User $customer, ?string $status = null): \Illuminate\Database\Eloquent\Collection
    {
        return FoodOrder::where('customer_id', $customer->id)
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'restaurant', 'driver'])
            ->latest()
            ->get();
    }

    public function getDriverOrders(User $driver, ?string $status = null): \Illuminate\Database\Eloquent\Collection
    {
        return FoodOrder::where('driver_id', $driver->id)
            ->when($status, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'restaurant', 'customer'])
            ->latest()
            ->get();
    }

    public function getAvailableOrders(User $driver, ?string $status = null): \Illuminate\Database\Eloquent\Collection
    {
        if ($this->fraudGuardService->isBlockedFromAccepting($driver)) {
            return new \Illuminate\Database\Eloquent\Collection;
        }

        $latitude = $driver->current_latitude;
        $longitude = $driver->current_longitude;

        $query = FoodOrder::whereNull('driver_id')
            ->whereIn('status', ['confirmed', 'ready']);

        if ($latitude && $longitude) {
            $query->whereRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(delivery_latitude)) * cos(radians(delivery_longitude) - radians(?)) + sin(radians(?)) * sin(radians(delivery_latitude)))) <= ?',
                [$latitude, $longitude, $latitude, 15]
            );
        }

        $orders = $query->with(['items', 'restaurant', 'customer'])
            ->latest()
            ->get();

        return $orders->filter(fn (FoodOrder $order) => $this->fleetModeService->allows(
            $driver,
            FleetModeService::VERTICAL_FOOD,
            $order->tenant_id,
        ))->values();
    }

    public function getRestaurantOrders($restaurantIds, array $filters = [], int $perPage = 15)
    {
        return FoodOrder::whereIn('restaurant_id', $restaurantIds)
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->with(['items', 'customer', 'driver'])
            ->latest()
            ->paginate($perPage);
    }

    public function processRefund(FoodOrder $order): Payment
    {
        $payment = $order->payment;

        if (! $payment) {
            throw new \RuntimeException('No payment found for this order.');
        }

        if ($payment->status === Payment::STATUS_REFUNDED) {
            throw new \RuntimeException('Payment already refunded.');
        }

        return DB::transaction(function () use ($payment, $order) {
            $payment->update([
                'status' => Payment::STATUS_REFUNDED,
                'refunded_at' => now(),
                'refund_reason' => 'Order cancelled',
                'refund_amount' => $payment->amount,
            ]);

            $customer = $order->customer;
            $wallet = $this->walletService->getOrCreateWallet($customer);

            $this->walletService->credit(
                $wallet,
                (float) $payment->amount,
                'refund',
                $order->id,
                "Refund for food order {$order->id}",
            );

            Log::info('Food order refund processed', [
                'order_id' => $order->id,
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
            ]);

            return $payment->fresh();
        });
    }

    private function isRestaurantOpen(Restaurant $restaurant): bool
    {
        if (! $restaurant->opens_at || ! $restaurant->closes_at) {
            return true;
        }

        $now = now()->format('H:i');

        return $now >= $restaurant->opens_at && $now <= $restaurant->closes_at;
    }

    private function creditDriverEarnings(FoodOrder $order): void
    {
        $driver = $order->driver;
        if (! $driver) {
            return;
        }

        $driverPayout = (float) $order->delivery_fee + (float) $order->tip_amount;
        if ($driverPayout <= 0) {
            return;
        }

        $wallet = $this->walletService->getOrCreateWallet($driver);

        $this->walletService->credit(
            $wallet,
            $driverPayout,
            'food_delivery_earnings',
            $order->id,
            "Earnings for food delivery {$order->id}",
        );
    }
}
