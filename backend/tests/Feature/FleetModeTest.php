<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\FoodOrder;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use App\Services\DeliveryService;
use App\Services\FleetModeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FleetModeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function makeDriver(string $fleetType = 'private', ?string $tenantId = null): User
    {
        $driver = User::factory()->create(array_filter([
            'role' => 'driver',
            'is_online' => true,
            'is_active' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
            'tenant_id' => $tenantId,
        ]));
        $driver->assignRole('driver');

        DriverProfile::create([
            'user_id' => $driver->id,
            'is_approved' => true,
            'is_verified' => true,
            'fleet_type' => $fleetType,
        ]);

        Wallet::create([
            'user_id' => $driver->id,
            'balance' => 100,
            'pending_balance' => 0,
            'currency' => 'ZAR',
        ]);

        return $driver;
    }

    private function setPoolMode(string $vertical, string $mode, string $tenantId): void
    {
        app(\App\Services\SettingService::class)->set("{$vertical}_pool_mode", $mode, 'string', null, $tenantId);
    }

    public function test_pool_mode_filters_food_orders(): void
    {
        $tenant = Tenant::factory()->create();
        $easyrydeDriver = $this->makeDriver('easyryde');
        $privateDriver = $this->makeDriver('private');

        FoodOrder::create([
            'tenant_id' => $tenant->id,
            'restaurant_id' => \App\Models\Restaurant::factory()->create(['tenant_id' => $tenant->id])->id,
            'customer_id' => User::factory()->create()->id,
            'status' => 'confirmed',
            'delivery_latitude' => -23.9468,
            'delivery_longitude' => 29.4726,
            'delivery_address' => 'Phalaborwa',
            'subtotal' => 80.00,
            'total_amount' => 80.00,
        ]);

        $this->setPoolMode('food', 'easyryde_only', $tenant->id);

        $service = app(\App\Services\FoodOrderService::class);

        $this->assertSame(1, $service->getAvailableOrders($easyrydeDriver)->count());
        $this->assertSame(0, $service->getAvailableOrders($privateDriver)->count());
    }

    public function test_pool_modes_are_independent_per_vertical(): void
    {
        $tenant = Tenant::factory()->create();
        $easyrydeDriver = $this->makeDriver('easyryde');
        $privateDriver = $this->makeDriver('private');

        $this->setPoolMode('rides', 'easyryde_only', $tenant->id);
        $this->setPoolMode('food', 'both', $tenant->id);

        $service = app(FleetModeService::class);

        $this->assertTrue($service->allows($easyrydeDriver, FleetModeService::VERTICAL_RIDES, $tenant->id));
        $this->assertFalse($service->allows($privateDriver, FleetModeService::VERTICAL_RIDES, $tenant->id));
        $this->assertTrue($service->allows($privateDriver, FleetModeService::VERTICAL_FOOD, $tenant->id));
    }

    public function test_parcel_deliveries_share_the_food_pool(): void
    {
        $tenant = Tenant::factory()->create();
        $privateDriver = $this->makeDriver('private');
        $easyrydeDriver = $this->makeDriver('easyryde');

        Delivery::create([
            'tenant_id' => $tenant->id,
            'sender_id' => $easyrydeDriver->id,
            'status' => 'pending',
            'type' => 'parcel',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
        ]);

        $this->setPoolMode('food', 'easyryde_only', $tenant->id);

        $service = app(DeliveryService::class);

        $this->assertSame(1, $service->getAvailableDeliveries($easyrydeDriver)->count());
        $this->assertSame(0, $service->getAvailableDeliveries($privateDriver)->count());
    }

    public function test_accept_ride_rejects_driver_outside_pool(): void
    {
        $tenant = Tenant::factory()->create();
        $privateDriver = $this->makeDriver('private');

        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $ride = \App\Models\Ride::factory()->create([
            'tenant_id' => $tenant->id,
            'rider_id' => $rider->id,
            'status' => 'searching',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
        ]);

        $this->setPoolMode('rides', 'easyryde_only', $tenant->id);

        $result = app(\App\Services\RideMatchingService::class)->accept($ride, $privateDriver);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('fleet pool', $result['message']);
    }

    public function test_update_settings_guard_blocks_empty_pool_change(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id]);
        $admin->assignRole('admin');

        \Laravel\Sanctum\Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/settings', [
            'key' => 'rides_pool_mode',
            'value' => 'easyryde_only',
        ])->assertStatus(422)
            ->assertJsonFragment(['message' => 'Pool mode would leave zero eligible rides drivers. Aborting to prevent outage.']);
    }

    public function test_update_settings_guard_accepts_both_when_only_easyryde_drivers_exist(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->create(['tenant_id' => $tenant->id]);
        $admin->assignRole('admin');

$this->makeDriver('easyryde', $tenant->id);

        \Laravel\Sanctum\Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/settings', [
            'key' => 'rides_pool_mode',
            'value' => 'both',
        ])->assertOk()
            ->assertJson(['key' => 'rides_pool_mode', 'value' => 'both']);

        $this->assertDatabaseHas('system_settings', [
            'tenant_id' => $tenant->id,
            'key' => 'rides_pool_mode',
            'value' => 'both',
        ]);
    }
}