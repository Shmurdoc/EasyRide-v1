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

class PoolExtendedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
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

    // ─── Join ────────────────────────────────────────────────────────────

    public function test_cannot_join_full_pool(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver, 'matching', 1);

        $rider1 = $this->createRider();
        $ride1 = $this->createRide($rider1);

        Sanctum::actingAs($rider1);
        $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride1->id,
        ]);

        $rider2 = $this->createRider();
        $ride2 = $this->createRide($rider2);

        Sanctum::actingAs($rider2);
        $response = $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride2->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'This pool ride is full.');
    }

    public function test_cannot_join_non_matching_pool(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver, 'in_progress');

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'This pool ride is no longer accepting passengers.');
    }

    public function test_cannot_join_with_others_ride(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider1 = $this->createRider();
        $ride1 = $this->createRide($rider1);

        $rider2 = $this->createRider();
        $ride2 = $this->createRide($rider2);

        Sanctum::actingAs($rider1);
        $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride1->id,
        ]);

        Sanctum::actingAs($rider2);
        $response = $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride1->id,
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'You can only join a pool with your own ride.');
    }

    public function test_cannot_join_same_pool_twice(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
        ]);

        $response = $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'You have already joined this pool ride.');
    }

    // ─── Leave ───────────────────────────────────────────────────────────

    public function test_cannot_leave_pool_not_joined(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/pool/leave', [
            'pool_ride_id' => $poolRide->id,
        ]);

        $response->assertStatus(404);
    }

    public function test_cannot_leave_after_pickup(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);
        $ride = $this->createRide($rider);

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'picked_up',
        ]);

        $poolRide->increment('current_passengers');

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/pool/leave', [
            'pool_ride_id' => $poolRide->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Cannot leave after being picked up.');
    }

    // ─── Matches ─────────────────────────────────────────────────────────

    public function test_matches_filters_by_radius(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/pool/matches?pickup_lat=-23.9468&pickup_lng=29.4726&dropoff_lat=-23.9500&dropoff_lng=29.4800&radius_km=1');

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_matches_excludes_full_pools(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver, 'matching', 1);

        $rider1 = $this->createRider();
        $ride1 = $this->createRide($rider1);

        Sanctum::actingAs($rider1);
        $this->postJson('/api/v1/pool/join', [
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride1->id,
        ]);

        $rider2 = $this->createRider();
        Sanctum::actingAs($rider2);

        $response = $this->getJson('/api/v1/pool/matches?pickup_lat=-23.9468&pickup_lng=29.4726&dropoff_lat=-23.9500&dropoff_lng=29.4800');

        $data = $response->json('data');
        $ids = array_column($data, 'id');
        $this->assertNotContains($poolRide->id, $ids);
    }

    // ─── Status ──────────────────────────────────────────────────────────

    public function test_driver_can_view_pool_status(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        Sanctum::actingAs($driver);
        $response = $this->getJson("/api/v1/pool/{$poolRide->id}/status");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_can_view_pool_status(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/v1/pool/{$poolRide->id}/status");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    // ─── Driver operations ───────────────────────────────────────────────

    public function test_driver_can_list_passengers(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
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

        Sanctum::actingAs($driver);
        $response = $this->getJson("/api/v1/driver/pool/{$poolRide->id}/passengers");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_non_driver_cannot_list_passengers(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson("/api/v1/driver/pool/{$poolRide->id}/passengers");

        $response->assertStatus(403);
    }

    public function test_driver_can_mark_pickup(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->patchJson("/api/v1/driver/pool/{$poolRide->id}/passenger/{$passenger->id}/pickup");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_driver_cannot_pickup_already_picked_up(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'picked_up',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->patchJson("/api/v1/driver/pool/{$poolRide->id}/passenger/{$passenger->id}/pickup");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Passenger is not in pending status.');
    }

    public function test_driver_can_mark_dropoff(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'picked_up',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->patchJson("/api/v1/driver/pool/{$poolRide->id}/passenger/{$passenger->id}/dropoff");

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_driver_cannot_dropoff_not_picked_up(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->patchJson("/api/v1/driver/pool/{$poolRide->id}/passenger/{$passenger->id}/dropoff");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Passenger has not been picked up yet.');
    }

    public function test_pool_completes_when_all_passengers_dropped_off(): void
    {
        $driver = $this->createDriver();
        $poolRide = $this->createPoolRide($driver);

        $rider = $this->createRider();
        $ride = $this->createRide($rider);

        $passenger = PoolPassenger::create([
            'pool_ride_id' => $poolRide->id,
            'ride_id' => $ride->id,
            'user_id' => $rider->id,
            'fare_share' => 37.50,
            'pickup_order' => 1,
            'dropoff_order' => 1,
            'status' => 'picked_up',
        ]);

        $poolRide->increment('current_passengers');

        Sanctum::actingAs($driver);
        $this->patchJson("/api/v1/driver/pool/{$poolRide->id}/passenger/{$passenger->id}/dropoff");

        $poolRide->refresh();
        $this->assertEquals('completed', $poolRide->status);
    }
}
