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

class PaymentExtendedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function createCompletedRide(User $rider, User $driver = null, float $fare = 150.00): Ride
    {
        return Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver?->id,
            'status' => 'completed',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => $fare,
            'completed_at' => now(),
        ]);
    }

    public function test_rider_can_view_payment_methods(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/payments/methods');

        $response->assertStatus(200)
            ->assertJsonStructure(['methods']);
    }

    public function test_rider_can_pay_with_cash(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = $this->createCompletedRide($rider);

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

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);
        $ride = $this->createCompletedRide($rider, $driver);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'method' => 'wallet',
            'status' => 'completed',
        ]);
    }

    public function test_wallet_payment_deducts_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $wallet = Wallet::create(['user_id' => $rider->id, 'balance' => 200.00]);
        $ride = $this->createCompletedRide($rider, $driver, 150.00);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $wallet->refresh();
        $this->assertEquals(50.00, $wallet->balance);
    }

    public function test_rider_can_view_payment_history(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride1 = $this->createCompletedRide($rider, null, 100.00);
        $ride2 = $this->createCompletedRide($rider, null, 50.00);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride1->id}/pay", ['payment_method' => 'cash']);
        $this->postJson("/api/v1/payments/rides/{$ride2->id}/pay", ['payment_method' => 'cash']);

        $response = $this->getJson('/api/v1/payments');
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_rider_can_view_single_payment(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = $this->createCompletedRide($rider);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'cash']);

        $payment = Payment::first();
        $response = $this->getJson("/api/v1/payments/{$payment->id}");

        $response->assertStatus(200);
    }

    public function test_rider_cannot_view_others_payment(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $ride = $this->createCompletedRide($rider1);
        Sanctum::actingAs($rider1);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'cash']);

        $payment = Payment::first();
        Sanctum::actingAs($rider2);
        $this->getJson("/api/v1/payments/{$payment->id}")->assertStatus(403);
    }

    public function test_create_stripe_intent_validates_amount(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/payments/stripe/create-intent', [])->assertStatus(422);
    }

    public function test_confirm_stripe_payment_validates_intent_id(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/payments/stripe/confirm', [])->assertStatus(422);
    }

    public function test_payfast_return_handled(): void
    {
        $response = $this->getJson('/api/v1/webhooks/payfast/return');

        $response->assertStatus(200);
    }

    public function test_ozow_return_handled(): void
    {
        $response = $this->getJson('/api/v1/webhooks/ozow/return');

        $response->assertStatus(200);
    }

    public function test_rider_can_dispute_payment(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = $this->createCompletedRide($rider);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'cash']);

        $payment = Payment::first();
        $response = $this->postJson("/api/v1/payments/{$payment->id}/dispute", [
            'reason' => 'incorrect_amount',
            'description' => 'Charged more than expected',
        ]);

        $response->assertStatus(201);
    }

    public function test_cannot_dispute_others_payment(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $ride = $this->createCompletedRide($rider1);
        Sanctum::actingAs($rider1);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'cash']);

        $payment = Payment::first();
        Sanctum::actingAs($rider2);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/dispute", [
            'reason' => 'incorrect_amount',
            'description' => 'Not my payment',
        ]);

        $response->assertStatus(403);
    }

    public function test_rider_cannot_refund(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = $this->createCompletedRide($rider);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'cash']);

        $payment = Payment::first();
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'reason' => 'duplicate_charge',
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_refund(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = $this->createCompletedRide($rider);
        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'cash']);

        $payment = Payment::first();
        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'reason' => 'duplicate_charge',
        ]);

        $response->assertStatus(200);
    }

    public function test_unauthenticated_cannot_access_payments(): void
    {
        $this->getJson('/api/v1/payments')->assertStatus(401);
        $this->getJson('/api/v1/payments/methods')->assertStatus(401);
    }
}
