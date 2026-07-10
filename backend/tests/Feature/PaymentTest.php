<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_rider_can_pay_with_cash(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
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

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 150.00,
            'method' => 'cash',
            'status' => 'completed',
        ]);
    }

    public function test_rider_can_pay_with_wallet(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
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

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(201);
        $wallet->refresh();
        $this->assertEquals(350.0, $wallet->balance);
    }

    public function test_rider_can_get_payment_history(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Payment::create([
            'ride_id' => null,
            'payer_id' => $rider->id,
            'amount' => 100.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson('/api/v1/payments');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_can_refund_payment(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => null,
            'status' => 'completed',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 200.00,
        ]);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 200.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 200.00,
            'reason' => 'duplicate_charge',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'refunded',
        ]);
    }

    public function test_rider_cannot_refund_payment(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $payment = Payment::create([
            'ride_id' => null,
            'payer_id' => $rider->id,
            'amount' => 200.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 200.00,
            'reason' => 'Want my money back',
        ]);

        $response->assertStatus(403);
    }

    public function test_rider_can_dispute_payment(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => null,
            'status' => 'completed',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
            'completed_at' => now(),
        ]);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 150.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/dispute", [
            'reason' => 'Charged wrong amount',
            'description' => 'I was charged 150 but the ride was only supposed to be 100',
        ]);

        $response->assertStatus(201);
    }

    public function test_rider_can_get_payment_methods(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/payments/methods');

        $response->assertStatus(200)
            ->assertJsonStructure(['methods']);
    }

    public function test_unauthenticated_cannot_pay(): void
    {
        $response = $this->postJson('/api/v1/payments/rides/1/pay', [
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(401);
    }

    public function test_payment_is_recorded_for_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
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

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'amount' => 150.00,
        ]);
    }
}
