<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RideStatus;
use App\Models\DriverProfile;
use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use App\Services\NotificationService;
use App\Services\SocketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class IntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $this->mock(NotificationService::class, fn ($mock) => $mock->shouldReceive('notify')->zeroOrMoreTimes());
        $this->mock(SocketService::class, fn ($mock) => $mock->shouldReceive('broadcastToAllDrivers', 'broadcastToRide', 'broadcastToRideWithEvent', 'stopTrackingRide')->zeroOrMoreTimes());
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function createRider(array $overrides = []): User
    {
        $user = User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Rider',
            'email' => uniqid('rider_') . '@test.com',
            'password' => 'Password1!',
            'role' => 'rider',
            'phone_number' => '+27800000001',
            'is_verified' => true,
            'is_active' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ], $overrides));

        $user->assignRole('rider');

        return $user;
    }

    private function createDriver(array $overrides = []): User
    {
        $user = User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Driver',
            'email' => uniqid('driver_') . '@test.com',
            'password' => 'Password1!',
            'role' => 'driver',
            'phone_number' => '+27800000002',
            'is_verified' => true,
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ], $overrides));

        $user->assignRole('driver');

        DriverProfile::create([
            'user_id' => $user->id,
            'is_approved' => true,
            'is_verified' => true,
        ]);

        return $user;
    }

    private function createAdmin(array $overrides = []): User
    {
        $admin = User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Admin',
            'email' => uniqid('admin_') . '@test.com',
            'password' => 'Password1!',
            'role' => 'admin',
            'phone_number' => '+27800000003',
            'is_verified' => true,
        ], $overrides));

        $admin->assignRole('admin');

        return $admin;
    }

    // ══════════════════════════════════════════════════════════════
    // FLOW 1: Rider books a ride
    // ══════════════════════════════════════════════════════════════

    public function test_flow1_rider_registers_login_creates_ride(): void
    {
        // Step 1: Register rider
        $registerResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'Rider Flow1',
            'email' => 'flow1rider@test.com',
            'phone_number' => '+27821111111',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $registerResponse->assertStatus(201)
            ->assertJsonStructure(['data' => ['token', 'user']]);

        $riderToken = $registerResponse->json('data.token');

        // Step 2: Login rider
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'flow1rider@test.com',
            'password' => 'Password1!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('data.user.email', 'flow1rider@test.com');

        // Step 3: Create ride with Phalaborwa data
        $rideResponse = $this->postJson('/api/v1/rides', [
            'category' => 'standard',
            'pickup_address' => 'Phalaborwa CBD, Limpopo',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'Phalaborwa Airport, Limpopo',
            'dropoff_lat' => -23.9600,
            'dropoff_lng' => 29.4800,
            'payment_method' => 'cash',
        ], [
            'Authorization' => "Bearer $riderToken",
        ]);

        $rideResponse->assertStatus(201)
            ->assertJsonStructure(['ride' => ['id', 'status']]);

        // Step 4: Verify ride created with status SEARCHING
        $rideId = $rideResponse->json('ride.id');
        $this->assertDatabaseHas('rides', [
            'id' => $rideId,
            'status' => RideStatus::SEARCHING->value,
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // FLOW 2: Driver accepts and completes ride
    // ══════════════════════════════════════════════════════════════

    public function test_flow2_driver_accepts_completes_ride_and_payment_recorded(): void
    {
        // Step 1: Create driver directly (public registration always assigns rider role)
        $driver = $this->createDriver(['email' => 'flow2driver@test.com']);

        // Step 2: Login driver and get token
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'flow2driver@test.com',
            'password' => 'Password1!',
        ]);

        $loginResponse->assertOk();
        $driverToken = $loginResponse->json('data.token');

        // Step 3: Update driver location
        $locationResponse = $this->postJson('/api/v1/drivers/location', [
            'latitude' => -23.9480,
            'longitude' => 29.4730,
        ], [
            'Authorization' => "Bearer $driverToken",
        ]);

        $locationResponse->assertOk()
            ->assertJsonPath('message', 'Location updated.');

        // Create a rider and a ride in SEARCHING status
        $rider = $this->createRider();
        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'tenant_id' => $rider->tenant_id,
            'rider_id' => $rider->id,
            'status' => RideStatus::SEARCHING,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'pickup_address' => 'Phalaborwa CBD, Limpopo',
            'dropoff_address' => 'Phalaborwa Airport, Limpopo',
            'category' => 'standard',
            'distance_km' => 5.0,
            'duration_minutes' => 12.0,
            'base_fare' => 15.00,
            'per_km_fare' => 8.00,
            'surge_multiplier' => 1.0,
            'total_fare' => 55.00,
            'payment_method' => 'cash',
        ]);

        // Step 4: Accept ride
        $acceptResponse = $this->postJson("/api/v1/rides/{$ride->id}/driver-accept", [], [
            'Authorization' => "Bearer $driverToken",
        ]);

        $acceptResponse->assertOk();
        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => RideStatus::ACCEPTED->value,
            'driver_id' => $driver->id,
        ]);

        // Step 5: Advance ride through valid transitions (accepted → driver_en_route → arrived)
        Ride::where('id', $ride->id)->update(['status' => RideStatus::DRIVER_EN_ROUTE->value]);

        // Step 6: Driver arrives
        $arrivedResponse = $this->postJson("/api/v1/rides/{$ride->id}/driver-arrived", [], [
            'Authorization' => "Bearer $driverToken",
        ]);

        $arrivedResponse->assertOk();
        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => RideStatus::ARRIVED->value,
        ]);

        // Step 6: Start ride
        $startResponse = $this->postJson("/api/v1/rides/{$ride->id}/start", [], [
            'Authorization' => "Bearer $driverToken",
        ]);

        $startResponse->assertOk();
        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => RideStatus::IN_PROGRESS->value,
        ]);

        // Step 7: Complete ride
        $completeResponse = $this->postJson("/api/v1/rides/{$ride->id}/complete", [
            'distance_km' => 5.2,
            'duration_minutes' => 14.0,
        ], [
            'Authorization' => "Bearer $driverToken",
        ]);

        $completeResponse->assertOk()
            ->assertJsonStructure(['ride' => ['id', 'status'], 'rating_required']);

        // Step 8: Verify ride status COMPLETED
        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => RideStatus::COMPLETED->value,
        ]);

        // Step 9: Process cash payment and verify
        // Cash payment service debits platform fee from driver's wallet — fund it
        $driverWallet = \App\Models\Wallet::firstOrCreate(
            ['user_id' => $driver->id],
            ['balance' => 0, 'currency' => 'ZAR']
        );
        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 1000.00,
            'payment_method' => 'payfast',
        ], [
            'Authorization' => "Bearer {$driverToken}",
        ]);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])
            ->assertStatus(201)
            ->assertJsonPath('message', 'Cash payment recorded.');

        // Step 10: Verify payment record exists
        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'method' => 'cash',
            'status' => 'completed',
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // FLOW 3: Wallet top-up
    // ══════════════════════════════════════════════════════════════

    public function test_flow3_wallet_topup_and_balance_verification(): void
    {
        // Step 1: Register rider
        $registerResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'Wallet Rider',
            'email' => 'walletrider@test.com',
            'phone_number' => '+27824444444',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $registerResponse->assertStatus(201);
        $riderToken = $registerResponse->json('data.token');

        // Step 2: Verify wallet starts at 0 balance
        $initialBalanceResponse = $this->getJson('/api/v1/wallet', [
            'Authorization' => "Bearer $riderToken",
        ]);

        $initialBalanceResponse->assertOk()
            ->assertJsonStructure(['balance', 'currency'])
            ->assertJsonPath('balance', 0);

        // Step 3: Top up wallet via deposit (payfast directly credits wallet in test)
        $depositResponse = $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 500.00,
            'payment_method' => 'payfast',
        ], [
            'Authorization' => "Bearer $riderToken",
        ]);

        $depositResponse->assertStatus(201)
            ->assertJsonStructure(['transaction', 'redirect_url']);

        // Step 4: Verify wallet balance updated to 500
        $balanceResponse = $this->getJson('/api/v1/wallet', [
            'Authorization' => "Bearer $riderToken",
        ]);

        $balanceResponse->assertOk()
            ->assertJsonPath('balance', fn ($val) => abs((float) $val - 500.0) < 0.01);

        // Step 5: Verify wallet record in database
        $rider = User::where('email', 'walletrider@test.com')->first();
        $this->assertDatabaseHas('wallets', [
            'user_id' => $rider->id,
        ]);

        $wallet = Wallet::where('user_id', $rider->id)->first();
        $this->assertEqualsWithDelta(500.0, (float) $wallet->balance, 0.01);

        // Step 6: Verify transaction was recorded
        $wallet = Wallet::where('user_id', $rider->id)->first();
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 500.00,
            'reference_type' => 'deposit',
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // FLOW 4: Admin management
    // ══════════════════════════════════════════════════════════════

    public function test_flow4_admin_dashboard_users_drivers_rides(): void
    {
        // Step 1: Admin logs in (admin registration is not public; use direct DB + Sanctum)
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        // Seed data for the admin to manage
        $rider1 = $this->createRider(['email' => 'adminrider1@test.com', 'phone_number' => '+27825555551']);
        $driver1 = $this->createDriver(['email' => 'admindriver1@test.com', 'phone_number' => '+27825555552']);

        Ride::create([
            'id' => \Str::uuid()->toString(),
            'tenant_id' => $rider1->tenant_id,
            'rider_id' => $rider1->id,
            'driver_id' => $driver1->id,
            'status' => RideStatus::COMPLETED,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'pickup_address' => 'Phalaborwa CBD, Limpopo',
            'dropoff_address' => 'Phalaborwa Airport, Limpopo',
            'category' => 'standard',
            'distance_km' => 5.0,
            'duration_minutes' => 12.0,
            'total_fare' => 55.00,
            'payment_method' => 'cash',
        ]);

        // Step 2: Get dashboard stats
        $dashboardResponse = $this->getJson('/api/v1/admin/dashboard');

        $dashboardResponse->assertOk()
            ->assertJsonStructure([
                'total_users',
                'total_drivers',
                'total_rides',
                'total_revenue',
            ]);

        // Step 3: List users
        $usersResponse = $this->getJson('/api/v1/admin/users');

        $usersResponse->assertOk()
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'email'],
                ],
            ]);

        // Verify at least 3 users exist (admin + rider + driver)
        $this->assertGreaterThanOrEqual(3, $usersResponse->json('data'));

        // Step 4: List drivers
        $driversResponse = $this->getJson('/api/v1/admin/drivers');

        $driversResponse->assertOk();
        $this->assertGreaterThanOrEqual(1, count($driversResponse->json('data', [])));

        // Step 5: List rides
        $ridesResponse = $this->getJson('/api/v1/admin/rides');

        $ridesResponse->assertOk();
        $this->assertGreaterThanOrEqual(1, count($ridesResponse->json('data', [])));
    }
}
