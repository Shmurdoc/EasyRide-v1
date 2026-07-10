<?php

namespace Tests\Feature;

use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminTest extends TestCase
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

    public function test_admin_can_get_dashboard_stats(): void
    {
        $admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_users',
                'total_drivers',
                'total_rides',
                'total_revenue',
            ]);
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        User::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/v1/admin/users');

        $response->assertStatus(200)
            ->assertJsonCount(4, 'data');
    }

    public function test_admin_can_list_rides(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        Ride::create([
            'rider_id' => User::factory()->create()->id,
            'status' => 'completed',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        $response = $this->getJson('/api/v1/admin/rides');

        $response->assertStatus(200);
    }

    public function test_admin_can_approve_driver(): void
    {
        $admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $admin->assignRole('admin');

        $driver = User::factory()->create(['is_approved' => false, 'tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');
        $driver->driverProfile()->create(['user_id' => $driver->id]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/drivers/{$driver->id}/approve");

        $response->assertStatus(200);
        $profile = $driver->driverProfile->fresh();
        $this->assertTrue($profile->is_approved);
    }

    public function test_admin_can_reject_driver(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $driver = User::factory()->create(['is_approved' => false]);
        $driver->assignRole('driver');

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/drivers/{$driver->id}/reject");

        $response->assertStatus(200);
    }

    public function test_admin_can_update_settings(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/settings', [
            'key' => 'platform_name',
            'value' => 'Phalaborwa Rides',
        ]);

        $response->assertStatus(200);
    }

    public function test_rider_cannot_access_admin(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_admin_can_create_driver(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/drivers', [
            'name' => 'New Driver',
            'email' => 'driver@test.com',
            'phone_number' => '+27123456789',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'is_approved' => true,
        ]);
    }

    public function test_admin_can_get_audit_logs(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/audit-logs');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_cannot_access_admin(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(401);
    }

    public function test_admin_can_list_drivers(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        User::factory()->create()->assignRole('driver');

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/v1/admin/drivers');

        $response->assertStatus(200);
    }
}
