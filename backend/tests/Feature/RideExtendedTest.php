<?php

namespace Tests\Feature;

use App\Models\Ride;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RideExtendedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    public function test_fare_estimate_returns_data(): void
    {
        $response = $this->getJson('/api/v1/rides/fare-estimate?' . http_build_query([
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'category' => 'standard',
        ]));

        $response->assertStatus(200);
    }

    public function test_fare_estimate_validates_params(): void
    {
        $response = $this->getJson('/api/v1/rides/fare-estimate');

        $response->assertStatus(422);
    }

    public function test_rider_can_view_own_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $createResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);

        $rideId = $createResponse->json('ride.id');
        $response = $this->getJson("/api/v1/rides/{$rideId}");

        $response->assertStatus(200);
    }

    public function test_rider_cannot_view_others_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $other = User::factory()->create();
        $other->assignRole('rider');

        Sanctum::actingAs($rider);
        $createResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);

        $rideId = $createResponse->json('ride.id');

        Sanctum::actingAs($other);
        $response = $this->getJson("/api/v1/rides/{$rideId}");

        $response->assertStatus(403);
    }

    public function test_rider_can_get_current_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);

        $response = $this->getJson('/api/v1/rides/current');

        $response->assertStatus(200);
    }

    public function test_rider_gets_null_when_no_current_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $this->getJson('/api/v1/rides/current')->assertStatus(404);
    }

    public function test_rider_can_get_ride_history(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/rides');

        $response->assertStatus(200);
    }

    public function test_rider_can_cancel_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $createResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);

        $rideId = $createResponse->json('ride.id');

        $response = $this->postJson("/api/v1/rides/{$rideId}/cancel", [
            'cancellation_reason' => 'Changed my mind',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('rides', ['id' => $rideId, 'status' => 'cancelled']);
    }

    public function test_driver_can_accept_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        Sanctum::actingAs($rider);
        $createResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);
        $rideId = $createResponse->json('ride.id');

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept")->assertStatus(200);
    }

    public function test_driver_cannot_accept_already_accepted_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver1 = User::factory()->create(['is_online' => true]);
        $driver1->assignRole('driver');
        $driver2 = User::factory()->create(['is_online' => true]);
        $driver2->assignRole('driver');

        Sanctum::actingAs($rider);
        $createResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);
        $rideId = $createResponse->json('ride.id');

        Sanctum::actingAs($driver1);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept");

        Sanctum::actingAs($driver2);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept")->assertStatus(422);
    }

    public function test_driver_can_complete_full_flow(): void
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
            'driver_id' => $driver->id,
            'status' => 'arrived',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'total_fare' => 150.00,
        ]);
        $rideId = $ride->id;

        Sanctum::actingAs($driver);

        $this->postJson("/api/v1/rides/{$rideId}/start")->assertStatus(200);
        $this->assertDatabaseHas('rides', ['id' => $rideId, 'status' => 'in_progress']);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);
        $this->postJson("/api/v1/rides/{$rideId}/complete")->assertStatus(200);
        $this->assertDatabaseHas('rides', ['id' => $rideId, 'status' => 'completed']);
    }

    public function test_rate_validates_score(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $createResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);

        $this->postJson("/api/v1/rides/{$createResponse->json('ride.id')}/rate", [
            'score' => 6,
        ])->assertStatus(422);

        $this->postJson("/api/v1/rides/{$createResponse->json('ride.id')}/rate", [
            'score' => 0,
        ])->assertStatus(422);
    }

    public function test_unauthenticated_user_cannot_create_ride(): void
    {
        $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'category' => 'standard',
            'payment_method' => 'cash',
        ])->assertStatus(401);
    }

    public function test_unauthenticated_cannot_access_rides(): void
    {
        $this->getJson('/api/v1/rides')->assertStatus(401);
        $this->getJson('/api/v1/rides/current')->assertStatus(401);
    }

    public function test_create_ride_validates_required_fields(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/rides', [])->assertStatus(422);
    }
}
