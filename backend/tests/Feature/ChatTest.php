<?php

namespace Tests\Feature;

use App\Models\Ride;
use App\Models\RideChatMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ChatTest extends TestCase
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
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        return $driver;
    }

    private function createRide(User $rider, User $driver, string $status = 'accepted'): Ride
    {
        return Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
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

    public function test_rider_can_get_messages_for_their_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $rider->id,
            'message' => 'Hello!',
        ]);

        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $driver->id,
            'message' => 'Hi there!',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson("/api/v1/chat/rides/{$ride->id}/messages");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');
    }

    public function test_driver_can_get_messages_for_their_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $rider->id,
            'message' => 'On my way!',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->getJson("/api/v1/chat/rides/{$ride->id}/messages");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    public function test_unauthorized_user_cannot_get_messages(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        $other = $this->createRider();
        Sanctum::actingAs($other);

        $response = $this->getJson("/api/v1/chat/rides/{$ride->id}/messages");

        $response->assertStatus(403);
    }

    public function test_rider_can_send_message_during_active_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver, 'accepted');

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/messages", [
            'ride_id' => $ride->id,
            'message' => 'I am at the pickup point.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('ride_chat_messages', [
            'ride_id' => $ride->id,
            'sender_id' => $rider->id,
            'message' => 'I am at the pickup point.',
        ]);
    }

    public function test_driver_can_send_message_during_active_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver, 'in_progress');

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/messages", [
            'ride_id' => $ride->id,
            'message' => 'Almost there!',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }

    public function test_send_message_fails_for_completed_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver, 'completed');

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/messages", [
            'ride_id' => $ride->id,
            'message' => 'Hello?',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_send_message_fails_for_searching_ride(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver, 'searching');

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/messages", [
            'ride_id' => $ride->id,
            'message' => 'Hello?',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_unauthorized_user_cannot_send_message(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        $other = $this->createRider();
        Sanctum::actingAs($other);

        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/messages", [
            'ride_id' => $ride->id,
            'message' => 'Not your ride!',
        ]);

        $response->assertStatus(403);
    }

    public function test_send_message_validates_message_field(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/messages", [
            'ride_id' => $ride->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_user_can_get_unread_count(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $driver->id,
            'message' => 'Hello from driver',
        ]);
        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $driver->id,
            'message' => 'Are you there?',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson("/api/v1/chat/rides/{$ride->id}/unread");

        $response->assertOk()
            ->assertJsonPath('unread_count', 2);
    }

    public function test_unread_count_excludes_own_messages(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $rider->id,
            'message' => 'Hello from rider',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson("/api/v1/chat/rides/{$ride->id}/unread");

        $response->assertOk()
            ->assertJsonPath('unread_count', 0);
    }

    public function test_user_can_mark_messages_as_read(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();
        $ride = $this->createRide($rider, $driver);

        RideChatMessage::create([
            'ride_id' => $ride->id,
            'sender_id' => $driver->id,
            'message' => 'Driver message',
            'is_read' => false,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/chat/rides/{$ride->id}/read");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('ride_chat_messages', [
            'ride_id' => $ride->id,
            'sender_id' => $driver->id,
            'is_read' => true,
        ]);
    }

    public function test_unauthenticated_cannot_access_chat(): void
    {
        $response = $this->getJson('/api/v1/chat/rides/some-id/messages');
        $response->assertStatus(401);
    }
}
