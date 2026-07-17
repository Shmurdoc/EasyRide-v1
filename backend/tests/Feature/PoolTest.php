<?php

namespace Tests\Feature;

use App\Models\PoolPassenger;
use App\Models\PoolRide;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PoolTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    private function createRider(): User
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        return $rider;
    }

    private function createDriver(): User
    {
        $driver = User::factory()->create([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        return $driver;
    }

    private function createRide(User $rider, string $status = 'searching'): Ride
    {
        return Ride::create([
            'rider_id' => $rider->id,
            'status' => $status,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => 'Phalaborwa CBD',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => 'Phalaborwa Airport',
            'total_fare' => 150.00,
        ]);
    }

    private function createPoolRide(User $driver, string $status = 'matching', int $maxPassengers = 4): PoolRide
    {
        $ride = $this->createRide($driver, 'in_progress');

        return PoolRide::create([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'status' => $status,
            'max_passengers' => $maxPassengers,
            'current_passengers' => 0,
            'total_fare' => 150.00,
        ]);
    }

    public function test_passenger_can_join_pool_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);
        $ride = $this->createRide($rider);

        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('pool_passengers', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
        ]);

        $poolRide->refresh();
        $this->assertEquals(1, $poolRide->current_passengers);
    }

    public function test_passenger_can_leave_pool_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);
        $ride = $this->createRide($rider);

        PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'pending',
        ]);

        $poolRide->increment('current_passengers');

        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/pool/leave', [
            'pool_ride_id' => $poolRide->id,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('pool_passengers', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
        ]);

        $poolRide->refresh();
        $this->assertEquals(0, $poolRide->current_passengers);
    }

    public function test_pool_ride_status_returns_details(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);
        $ride = $this->createRide($rider);

        PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider);

        $response = $this->getJson("/api/v1/pool/{$poolRide->id}/status");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $poolRide->id);
    }

    public function test_unauthorized_user_cannot_join_pool(): void
    {
        $response = $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => 'non-existent',
            'ride_id' => 'non-existent',
        ]);

        $response->assertStatus(401);
    }

    public function test_pool_join_validates_required_fields(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/pool/join', []);

        $response->assertStatus(422);
    }

    public function test_pool_leave_validates_required_fields(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/pool/leave', []);

        $response->assertStatus(422);
    }

    public function test_pool_status_returns_unauthorized_for_non_participant(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $otherRider = $this->createRider();
        Sanctum::actingAs($otherRider);

        $response = $this->getJson("/api/v1/pool/{$poolRide->id}/status");

        $response->assertStatus(403);
    }

    public function test_pool_matches_validates_required_fields(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/pool/matches');

        $response->assertStatus(422);
    }

    public function test_pool_matches_returns_matching_rides(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/pool/matches?pickup_lat=-23.9468&pickup_lng=29.4726&dropoff_lat=-23.9500&dropoff_lng=29.4800');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data']);
    }
}
