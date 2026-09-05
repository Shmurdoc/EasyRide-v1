<?php

namespace Tests\Feature;

use App\Models\Rating;
use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Wallet;
use App\Models\WalletTransaction;
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
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['total_earnings', 'today_earnings', 'pending_payout', 'total_trips']]);
    }

    public function test_driver_earnings_envelope_has_normalized_money_and_rating(): void
    {
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');
        $driver->driverProfile()->create(['total_trips' => 3, 'total_earnings' => 150.75]);

        $rider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'completed',
            'total_fare' => 100.50,
            'completed_at' => now(),
        ]);
        Rating::create([
            'ride_id' => $ride->id,
            'rater_id' => $rider->id,
            'ratee_id' => $driver->id,
            'score' => 5,
        ]);

        $wallet = Wallet::factory()->create(['user_id' => $driver->id, 'tenant_id' => $this->tenant->id]);
        WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'pending_payout',
            'amount' => 51.00,
            'balance_before' => 0,
            'balance_after' => 51.00,
            'description' => 'Trip payout',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->getJson('/api/v1/drivers/earnings');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [
                'total_earnings', 'today_earnings', 'pending_payout', 'total_trips',
                'rating', 'rating_count', 'hours_online', 'period', 'recent_transactions',
            ]]);

        $data = $response->json('data');

        // PG decimals must arrive as JSON numbers (mobile .toFixed safety).
        // NOTE: PHP json_encode renders whole floats as `51` (no trailing
        // .0); both decode as JS numbers, so assert numeric + loose equality.
        foreach (['total_earnings', 'today_earnings', 'pending_payout', 'rating', 'hours_online'] as $moneyKey) {
            $this->assertIsNumeric($data[$moneyKey]);
        }
        $this->assertIsInt($data['total_trips']);
        $this->assertEquals(150.75, $data['total_earnings']);
        $this->assertEquals(100.5, $data['today_earnings']);
        $this->assertEquals(51.0, $data['pending_payout']);
        $this->assertSame(3, $data['total_trips']);

        // Rating sourced from ratings table; hours_online documented 0.0 fallback.
        $this->assertEquals(5.0, $data['rating']);
        $this->assertSame(1, $data['rating_count']);
        $this->assertEquals(0.0, $data['hours_online']);

        // Transactions are plain arrays, never Eloquent models, money numeric.
        $this->assertNotEmpty($data['recent_transactions']);
        $tx = $data['recent_transactions'][0];
        $this->assertIsArray($tx);
        $this->assertIsNumeric($tx['amount']);
        $this->assertEquals(51.0, $tx['amount']);
        $this->assertArrayHasKey('created_at', $tx);
    }

    public function test_driver_trips_return_trip_resource_with_float_money(): void
    {
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');
        $rider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $rider->assignRole('rider');

        Ride::factory()->create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'completed',
            'total_fare' => 99.99,
            'distance_km' => 12.345,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->getJson('/api/v1/drivers/trips');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [['id', 'status', 'total_fare', 'distance_km']]]);

        $item = $response->json('data.0');
        $this->assertIsNumeric($item['total_fare']);
        $this->assertIsNumeric($item['distance_km']);
        $this->assertEquals(99.99, $item['total_fare']);
        $this->assertEquals(12.345, $item['distance_km']);
        $this->assertSame('completed', $item['status']);
    }

    public function test_driver_stats_are_normalized_with_rating_and_hours(): void
    {
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');
        $rider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'completed',
        ]);
        Ride::factory()->create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'cancelled',
        ]);
        Rating::create([
            'ride_id' => $ride->id,
            'rater_id' => $rider->id,
            'ratee_id' => $driver->id,
            'score' => 4,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->getJson('/api/v1/drivers/stats');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [
                'total_rides', 'completed_rides', 'cancelled_rides',
                'avg_rating', 'rating_count', 'today_rides', 'hours_online',
            ]]);

        $data = $response->json('data');
        $this->assertSame(2, $data['total_rides']);
        $this->assertSame(1, $data['completed_rides']);
        $this->assertSame(1, $data['cancelled_rides']);
        $this->assertIsNumeric($data['avg_rating']);
        $this->assertEquals(4.0, $data['avg_rating']);
        $this->assertSame(1, $data['rating_count']);
        $this->assertEquals(0.0, $data['hours_online']);
    }

    public function test_auth_me_includes_additive_driver_fields_and_login_is_unchanged(): void
    {
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');
        $driver->driverProfile()->create([
            'total_trips' => 2,
            'total_earnings' => 80.00,
            'is_approved' => true,
        ]);
        Vehicle::create([
            'user_id' => $driver->id,
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2020,
            'license_plate' => 'GP 999-111',
            'category' => 'standard',
            'is_active' => true,
        ]);

        $token = $driver->createToken('test-token')->plainTextToken;
        $me = $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/v1/auth/me');

        $me->assertStatus(200)
            ->assertJsonPath('data.user.email', $driver->email)
            ->assertJsonPath('data.user.roles', ['driver'])
            ->assertJsonPath('data.user.vehicle.make', 'Toyota')
            ->assertJsonPath('data.user.driver_profile.total_trips', 2)
            ->assertJsonPath('data.user.stats.total_trips', 2);

        // Login loads only `tenant`: additive keys stay absent (backward compat).
        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $driver->email,
            'password' => 'password',
        ]);
        $login->assertStatus(200)
            ->assertJsonPath('data.user.email', $driver->email)
            ->assertJsonMissingPath('data.user.roles')
            ->assertJsonMissingPath('data.user.vehicle');
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
