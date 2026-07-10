<?php

namespace Tests\Unit;

use App\Enums\RideStatus;
use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use App\Services\RideMatchingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RideMatchingTest extends TestCase
{
    use RefreshDatabase;

    private RideMatchingService $service;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RideMatchingService;
        $this->tenant = Tenant::factory()->create();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    public function test_accept_ride_sets_status_to_accepted(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'tenant_id' => $this->tenant->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9500,
            'pickup_longitude' => 29.4800,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        $result = $this->service->accept($ride, $driver);

        $this->assertTrue($result['success']);
        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => 'accepted',
            'driver_id' => $driver->id,
        ]);
    }

    public function test_accept_ride_fails_if_not_searching(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'tenant_id' => $this->tenant->id,
            'status' => 'accepted',
            'category' => 'standard',
            'pickup_latitude' => -23.9500,
            'pickup_longitude' => 29.4800,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        $result = $this->service->accept($ride, $driver);

        $this->assertFalse($result['success']);
    }

    public function test_calculate_distance(): void
    {
        $distance = $this->service->calculateDistance(
            -23.9468, 29.4726,
            -23.9500, 29.4800,
        );

        $this->assertGreaterThan(0, $distance);
        $this->assertIsFloat((float) $distance);
    }

    public function test_calculate_eta(): void
    {
        $eta = $this->service->calculateETA(
            -23.9468, 29.4726,
            -23.9500, 29.4800,
        );

        $this->assertGreaterThan(0, $eta);
        $this->assertIsInt($eta);
    }

    public function test_same_point_returns_zero_distance(): void
    {
        $distance = $this->service->calculateDistance(
            -23.9468, 29.4726,
            -23.9468, 29.4726,
        );

        $this->assertEquals(0.0, $distance);
    }

    public function test_far_distance_larger_than_near(): void
    {
        $near = $this->service->calculateDistance(
            -23.9468, 29.4726,
            -23.9470, 29.4730,
        );
        $far = $this->service->calculateDistance(
            -23.9468, 29.4726,
            -23.9600, 29.4900,
        );

        $this->assertGreaterThan($near, $far);
    }

    public function test_assign_driver_updates_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create([
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'tenant_id' => $this->tenant->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9500,
            'pickup_longitude' => 29.4800,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        $result = $this->service->assignDriver($ride, $driver);

        $this->assertEquals($driver->id, $result->driver_id);
        $this->assertEquals(RideStatus::ACCEPTED, $result->status);
        $this->assertNotNull($result->driver_eta);
    }
}
