<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\FoodOrder;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DriverFraudGuardService;
use App\Services\FleetModeService;
use App\Services\FoodOrderService;
use App\Services\SettingService;
use App\Services\PaymentService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class FoodOrderServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Tenant',
            'slug' => uniqid('tenant-'),
        ]);
    }

    private function createRider(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Rider',
            'email' => uniqid('rider_') . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'rider',
            'phone_number' => '+27800000001',
            'is_verified' => true,
        ], $overrides));
    }

    private function createRestaurant(array $overrides = []): Restaurant
    {
        return Restaurant::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Restaurant',
            'slug' => uniqid('restaurant-'),
            'description' => 'A test restaurant',
            'address' => '123 Main St',
            'latitude' => -23.9468,
            'longitude' => 29.4726,
            'phone' => '+27800000002',
            'is_active' => true,
            'opens_at' => '00:00',
            'closes_at' => '23:59',
            'minimum_order' => 25.00,
            'delivery_fee' => 15.00,
        ], $overrides));
    }

    private function createMenuItem(Restaurant $restaurant, array $overrides = []): MenuItem
    {
        return MenuItem::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'restaurant_id' => $restaurant->id,
            'name' => 'Burger',
            'description' => 'A delicious burger',
            'price' => 45.00,
            'category' => 'mains',
            'is_available' => true,
        ], $overrides));
    }

    // ── createOrder ─────────────────────────────────────────────

    public function test_create_order_success(): void
    {
        $rider = $this->createRider();
        $restaurant = $this->createRestaurant();
        $menuItem = $this->createMenuItem($restaurant);

        $paymentService = Mockery::mock(PaymentService::class);
        $walletService = Mockery::mock(WalletService::class);

        $foodOrderService = new FoodOrderService($paymentService, $walletService, Mockery::mock(DriverFraudGuardService::class), new FleetModeService(new SettingService));

        $result = $foodOrderService->createOrder($restaurant, $rider, [
            ['menu_item_id' => $menuItem->id, 'quantity' => 2],
        ], [
            'address' => '456 Oak Ave',
            'latitude' => -23.9600,
            'longitude' => 29.4800,
        ]);

        $this->assertInstanceOf(FoodOrder::class, $result);
        $this->assertDatabaseHas('food_orders', [
            'customer_id' => $rider->id,
            'restaurant_id' => $restaurant->id,
        ]);
    }

    public function test_create_order_fails_when_restaurant_inactive(): void
    {
        $rider = $this->createRider();
        $restaurant = $this->createRestaurant(['is_active' => false]);
        $menuItem = $this->createMenuItem($restaurant);

        $paymentService = Mockery::mock(PaymentService::class);
        $walletService = Mockery::mock(WalletService::class);

        $foodOrderService = new FoodOrderService($paymentService, $walletService, Mockery::mock(DriverFraudGuardService::class), new FleetModeService(new SettingService));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Restaurant is not available');

        $foodOrderService->createOrder($restaurant, $rider, [
            ['menu_item_id' => $menuItem->id, 'quantity' => 1],
        ], [
            'address' => '456 Oak Ave',
            'latitude' => -23.9600,
            'longitude' => 29.4800,
        ]);
    }

    public function test_create_order_fails_when_below_minimum_order(): void
    {
        $rider = $this->createRider();
        $restaurant = $this->createRestaurant(['minimum_order' => 100.00]);
        $menuItem = $this->createMenuItem($restaurant, ['price' => 30.00]);

        $paymentService = Mockery::mock(PaymentService::class);
        $walletService = Mockery::mock(WalletService::class);

        $foodOrderService = new FoodOrderService($paymentService, $walletService, Mockery::mock(DriverFraudGuardService::class), new FleetModeService(new SettingService));

        $this->expectException(\RuntimeException::class);

        $foodOrderService->createOrder($restaurant, $rider, [
            ['menu_item_id' => $menuItem->id, 'quantity' => 1],
        ], [
            'address' => '456 Oak Ave',
            'latitude' => -23.9600,
            'longitude' => 29.4800,
        ]);
    }

    public function test_create_order_fails_when_menu_item_unavailable(): void
    {
        $rider = $this->createRider();
        $restaurant = $this->createRestaurant();
        $menuItem = $this->createMenuItem($restaurant, ['is_available' => false]);

        $paymentService = Mockery::mock(PaymentService::class);
        $walletService = Mockery::mock(WalletService::class);

        $foodOrderService = new FoodOrderService($paymentService, $walletService, Mockery::mock(DriverFraudGuardService::class), new FleetModeService(new SettingService));

        $this->expectException(\RuntimeException::class);

        $foodOrderService->createOrder($restaurant, $rider, [
            ['menu_item_id' => $menuItem->id, 'quantity' => 1],
        ], [
            'address' => '456 Oak Ave',
            'latitude' => -23.9600,
            'longitude' => 29.4800,
        ]);
    }
}
