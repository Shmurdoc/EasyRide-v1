<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    public function test_rider_can_create_delivery(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/deliveries', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Phalaborwa Mall',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Phalaborwa Hospital',
            'item_description' => 'Medical supplies',
            'recipient_name' => 'John Doe',
            'recipient_phone' => '+27123456789',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['delivery' => ['id', 'status']]);

        $this->assertDatabaseHas('deliveries', [
            'sender_id' => $rider->id,
            'status' => 'pending',
        ]);
    }

    public function test_rider_can_get_delivery_history(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Delivery::create([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'delivered',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 80.00,
            'item_description' => 'Package',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson('/api/v1/deliveries');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_driver_can_get_nearby_deliveries(): void
    {
        $driver = User::factory()->create([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');
        Sanctum::actingAs($driver);

        Delivery::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'sender_id' => User::factory()->create()->id,
            'status' => 'pending',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 80.00,
            'item_description' => 'Package',
        ]);

        $response = $this->getJson('/api/v1/drivers/deliveries');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_cannot_create_delivery(): void
    {
        $response = $this->postJson('/api/v1/deliveries', [
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'item_description' => 'Package',
            'item_weight' => 1.0,
            'category' => 'document',
        ]);

        $response->assertStatus(401);
    }

    public function test_rider_can_get_single_delivery(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $delivery = Delivery::create([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'pending',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 80.00,
            'item_description' => 'Package',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson("/api/v1/deliveries/{$delivery->id}");

        $response->assertStatus(200)
            ->assertJsonPath('delivery.id', $delivery->id);
    }

    public function test_driver_can_assign_delivery(): void
    {
        Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $driver = User::factory()->create([
            'is_online' => true,
        ]);
        $driver->assignRole('driver');

        $delivery = Delivery::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'sender_id' => User::factory()->create()->id,
            'status' => 'pending',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 80.00,
            'item_description' => 'Package',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/deliveries/{$delivery->id}/assign", [
            'driver_id' => $driver->id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('deliveries', [
            'id' => $delivery->id,
            'driver_id' => $driver->id,
        ]);
    }
}
