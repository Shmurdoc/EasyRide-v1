<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DriverTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $this->tenant = Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant', 'domain' => 'test.local']);
    }

    public function test_admin_can_approve_driver(): void
    {
        $admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $admin->assignRole('admin');

        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');

        $driver->driverProfile()->create([
            'is_approved' => false,
            'is_verified' => false,
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/drivers/{$driver->id}/approve");

        $response->assertStatus(200);
        $this->assertDatabaseHas('driver_profiles', [
            'user_id' => $driver->id,
            'is_approved' => true,
        ]);
    }

    public function test_admin_can_reject_driver(): void
    {
        $admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $admin->assignRole('admin');

        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/drivers/{$driver->id}/reject");

        $response->assertStatus(200);
    }

    public function test_driver_can_toggle_online(): void
    {
        $driver = User::factory()->create([
            'is_online' => false,
        ]);
        $driver->assignRole('driver');
        Sanctum::actingAs($driver);

        $response = $this->postJson('/api/v1/drivers/toggle-online', [
            'is_online' => true,
        ]);

        $response->assertStatus(200);
        $driver->refresh();
        $this->assertTrue($driver->is_online);
    }

    public function test_driver_can_register_vehicle(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');
        Sanctum::actingAs($driver);

        $response = $this->postJson('/api/v1/drivers/vehicle', [
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2020,
            'color' => 'White',
            'license_plate' => 'GP 123-456',
            'category' => 'standard',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('vehicles', [
            'user_id' => $driver->id,
            'make' => 'Toyota',
        ]);
    }

    public function test_driver_can_get_earnings(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');
        Sanctum::actingAs($driver);

        $response = $this->getJson('/api/v1/drivers/earnings');

        $response->assertStatus(200)
            ->assertJsonStructure(['total_earnings', 'today_earnings', 'pending_payout', 'total_trips']);
    }

    public function test_driver_can_get_trips(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');
        Sanctum::actingAs($driver);

        $response = $this->getJson('/api/v1/drivers/trips');

        $response->assertStatus(200);
    }

    public function test_rider_cannot_approve_driver(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create();
        $driver->assignRole('driver');

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/admin/drivers/{$driver->id}/approve");

        $response->assertStatus(403);
    }

    public function test_driver_can_get_nearby_rides(): void
    {
        $driver = User::factory()->create([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        $vehicle = Vehicle::create([
            'user_id' => $driver->id,
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2020,
            'color' => 'White',
            'license_plate' => 'GP 123-456',
            'category' => 'standard',
            'is_active' => true,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->getJson('/api/v1/drivers/nearby-rides');

        $response->assertStatus(200);
    }

    public function test_admin_can_list_pending_drivers(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        User::factory()->create(['is_approved' => false])
            ->assignRole('driver');

        $response = $this->getJson('/api/v1/admin/drivers');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_cannot_toggle_online(): void
    {
        $response = $this->postJson('/api/v1/drivers/toggle-online');

        $response->assertStatus(401);
    }
}
