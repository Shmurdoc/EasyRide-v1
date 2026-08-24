<?php

namespace Tests\Feature;

use App\Models\ScheduledRide;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ScheduledRideExtendedTest extends TestCase
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

    // ─── Store ───────────────────────────────────────────────────────────

    public function test_schedule_ride_stores_with_all_valid_fields(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/scheduled-rides', [
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => 'Phalaborwa CBD',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => 'Phalaborwa Airport',
            'scheduled_at' => now()->addHours(3)->format('Y-m-d H:i:s'),
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Ride scheduled successfully.');
    }

    public function test_schedule_ride_requires_pickup_address(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/scheduled-rides', [
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'scheduled_at' => now()->addHours(2)->format('Y-m-d H:i:s'),
        ]);

        $response->assertStatus(422);
    }

    public function test_schedule_ride_requires_scheduled_at(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/scheduled-rides', [
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
        ]);

        $response->assertStatus(422);
    }

    public function test_schedule_ride_rejects_past_date(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/scheduled-rides', [
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'scheduled_at' => now()->subHours(2)->format('Y-m-d H:i:s'),
        ]);

        $response->assertStatus(422);
    }

    // ─── Cancel ──────────────────────────────────────────────────────────

    public function test_rider_can_cancel_their_own_scheduled_ride(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $scheduled = ScheduledRide::create([
            'rider_id' => $rider->id,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'scheduled_at' => now()->addHours(3),
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/v1/scheduled-rides/{$scheduled->id}/cancel");

        $response->assertStatus(200);
    }

    public function test_rider_cannot_cancel_others_scheduled_ride(): void
    {
        $rider1 = $this->createRider();
        $rider2 = $this->createRider();

        $scheduled = ScheduledRide::create([
            'rider_id' => $rider1->id,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'scheduled_at' => now()->addHours(3),
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider2);
        $response = $this->postJson("/api/v1/scheduled-rides/{$scheduled->id}/cancel");

        $response->assertStatus(422);
    }

    public function test_cancel_already_cancelled_ride_returns_error(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $scheduled = ScheduledRide::create([
            'rider_id' => $rider->id,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'scheduled_at' => now()->addHours(3),
            'status' => 'cancelled',
        ]);

        $response = $this->postJson("/api/v1/scheduled-rides/{$scheduled->id}/cancel");

        $response->assertStatus(422);
    }

    // ─── Index ───────────────────────────────────────────────────────────

    public function test_rider_only_sees_their_own_scheduled_rides(): void
    {
        $rider1 = $this->createRider();
        $rider2 = $this->createRider();

        ScheduledRide::create([
            'rider_id' => $rider1->id,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'scheduled_at' => now()->addHours(3),
            'status' => 'pending',
        ]);

        ScheduledRide::create([
            'rider_id' => $rider2->id,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '789 Pine Rd',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '321 Elm St',
            'scheduled_at' => now()->addHours(4),
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider1);
        $response = $this->getJson('/api/v1/scheduled-rides');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
    }

    public function test_unauthenticated_cannot_cancel_scheduled_ride(): void
    {
        $response = $this->postJson('/api/v1/scheduled-rides/non-existent/cancel');
        $this->assertContains($response->status(), [401, 404]);
    }
}
