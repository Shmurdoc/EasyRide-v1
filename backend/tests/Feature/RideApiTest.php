<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RideCategory;
use App\Enums\RideStatus;
use App\Models\DriverProfile;
use App\Models\Ride;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RideApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Spatie roles (required by role: middleware)
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);

        // Mock NotificationService to avoid EmailService $apiKey resolution
        $notificationMock = Mockery::mock(NotificationService::class);
        $notificationMock->shouldReceive('notify')->zeroOrMoreTimes();
        $this->app->instance(NotificationService::class, $notificationMock);
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
            'password' => bcrypt('password'),
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
            'password' => bcrypt('password'),
            'role' => 'driver',
            'phone_number' => '+27800000002',
            'is_verified' => true,
            'is_online' => true,
            'current_latitude' => -23.9500,
            'current_longitude' => 29.4750,
        ], $overrides));

        $user->assignRole('driver');

        return $user;
    }

    // ── POST /rides ─────────────────────────────────────────────

    public function test_create_ride_returns_201(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider, ['rider']);

        $response = $this->postJson('/api/v1/rides', [
            'category' => 'standard',
            'pickup_address' => '123 Main St, Phalaborwa',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => '456 Oak Ave, Phalaborwa',
            'dropoff_lat' => -23.9600,
            'dropoff_lng' => 29.4800,
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'ride' => ['id', 'status'],
            ]);

        $this->assertDatabaseHas('rides', [
            'rider_id' => $rider->id,
            'status' => RideStatus::SEARCHING->value,
        ]);
    }

    public function test_create_ride_validation_fails_without_required_fields(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider, ['rider']);

        $response = $this->postJson('/api/v1/rides', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'category',
                'pickup_address',
                'pickup_lat',
                'pickup_lng',
                'dropoff_address',
                'dropoff_lat',
                'dropoff_lng',
                'payment_method',
            ]);
    }

    // ── POST /rides/{ride}/driver-accept ────────────────────────

    public function test_driver_accept_ride_returns_200(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();

        DriverProfile::create([
            'user_id' => $driver->id,
            'is_approved' => true,
        ]);

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'status' => RideStatus::SEARCHING,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'category' => RideCategory::STANDARD,
            'route_distance_km' => 5.0,
            'estimated_fare' => 50.00,
            'total_fare' => 50.00,
        ]);

        Sanctum::actingAs($driver, ['driver']);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/driver-accept");

        $response->assertOk()
            ->assertJsonStructure([
                'id',
                'status',
            ]);
    }

    // ── POST /rides/{ride}/cancel ───────────────────────────────

    public function test_cancel_ride_returns_200(): void
    {
        $rider = $this->createRider();

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'status' => RideStatus::SEARCHING,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'category' => RideCategory::STANDARD,
            'route_distance_km' => 5.0,
            'cancellation_fee' => 0,
            'total_fare' => 50.00,
        ]);

        Sanctum::actingAs($rider, ['rider']);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Changed my mind',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => RideStatus::CANCELLED->value,
        ]);
    }
}
