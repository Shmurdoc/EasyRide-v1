<?php

namespace Tests\Feature;

use App\Models\FoodOrder;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantCategory;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FoodDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $customer;

    private User $driver;

    private Restaurant $restaurant;

    private MenuItem $menuItem;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);

        $this->tenant = Tenant::factory()->create();
        $this->customer = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->customer->assignRole('rider');

        $this->driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->driver->assignRole('driver');

        $this->restaurant = Restaurant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'minimum_order' => 20,
            'delivery_fee' => 15,
            'opens_at' => null,
            'closes_at' => null,
        ]);

        $category = RestaurantCategory::factory()->create([
            'restaurant_id' => $this->restaurant->id,
        ]);

        $this->menuItem = MenuItem::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'category_id' => $category->id,
            'price' => 45,
        ]);
    }

    public function test_list_restaurants(): void
    {
        $response = $this->actingAs($this->customer)
            ->getJson('/api/v1/food/restaurants');

        $response->assertOk();
    }

    public function test_show_restaurant(): void
    {
        $response = $this->actingAs($this->customer)
            ->getJson("/api/v1/food/restaurants/{$this->restaurant->id}");

        $response->assertOk()
            ->assertJsonStructure(['id', 'name', 'categories']);
    }

    public function test_view_menu(): void
    {
        $response = $this->actingAs($this->customer)
            ->getJson("/api/v1/food/restaurants/{$this->restaurant->id}/menu");

        $response->assertOk();
    }

    public function test_create_food_order(): void
    {
        $response = $this->actingAs($this->customer)
            ->postJson("/api/v1/food/restaurants/{$this->restaurant->id}/order", [
                'restaurant_id' => $this->restaurant->id,
                'items' => [
                    ['menu_item_id' => $this->menuItem->id, 'quantity' => 2],
                ],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ]);

        $response->assertCreated()
            ->assertJsonStructure(['id', 'status', 'total_amount', 'items']);
    }

    public function test_create_order_validates_items(): void
    {
        $response = $this->actingAs($this->customer)
            ->postJson("/api/v1/food/restaurants/{$this->restaurant->id}/order", [
                'restaurant_id' => $this->restaurant->id,
                'items' => [],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ]);

        $response->assertStatus(422);
    }

    public function test_view_my_orders(): void
    {
        FoodOrder::factory()->count(3)->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
        ]);

        $response = $this->actingAs($this->customer)
            ->getJson('/api/v1/food/orders');

        $response->assertOk();
    }

    public function test_driver_available_orders(): void
    {
        FoodOrder::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
            'driver_id' => null,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->driver)
            ->getJson('/api/v1/driver/food/orders/available');

        $response->assertOk();
    }

    public function test_driver_accepts_order(): void
    {
        $order = FoodOrder::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
            'driver_id' => null,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$order->id}/accept");

        $response->assertOk()
            ->assertJsonPath('status', 'confirmed')
            ->assertJsonPath('driver_id', $this->driver->id);
    }

    public function test_driver_orders_list(): void
    {
        FoodOrder::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
            'driver_id' => $this->driver->id,
            'status' => 'in_transit',
        ]);

        $response = $this->actingAs($this->driver)
            ->getJson('/api/v1/driver/food/orders');

        $response->assertOk();
    }

    public function test_driver_updates_order_status(): void
    {
        $order = FoodOrder::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
            'driver_id' => $this->driver->id,
            'status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$order->id}/status", [
                'status' => 'preparing',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'preparing');
    }

    public function test_cancel_order(): void
    {
        $order = FoodOrder::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->customer)
            ->postJson("/api/v1/food/orders/{$order->id}/cancel");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'cancelled');
    }

    public function test_rate_delivered_order(): void
    {
        $order = FoodOrder::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'customer_id' => $this->customer->id,
            'status' => 'delivered',
            'rating' => null,
            'actual_delivery_at' => now(),
        ]);

        $response = $this->actingAs($this->customer)
            ->postJson("/api/v1/food/orders/{$order->id}/rate", [
                'rating' => 5,
                'comment' => 'Delicious!',
            ]);

        $response->assertOk()
            ->assertJsonPath('rating', 5);
    }
}
