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

class PaymentEdgeCaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    // ─── Expired card / declined card simulation ─────────────────────────

    public function test_cannot_pay_for_nonexistent_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/payments/rides/non-existent/pay', [
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(404);
    }

    public function test_cannot_pay_twice_for_same_ride(): void
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

        Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 150.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_pay_for别人的_ride(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider1->id,
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

        Sanctum::actingAs($rider2);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(403);
    }

    public function test_cannot_pay_incomplete_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'in_progress',
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

        $response->assertStatus(422);
    }

    // ─── Refund edge cases ──────────────────────────────────────────────

    public function test_cannot_refund_already_refunded_payment(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
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
            'total_fare' => 200.00,
        ]);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 200.00,
            'method' => 'cash',
            'status' => 'refunded',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 200.00,
            'reason' => 'double_refund',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_refund_more_than_paid(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
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
            'total_fare' => 100.00,
        ]);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 100.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 500.00,
            'reason' => 'over_refund',
        ]);

        $response->assertStatus(422);
    }

    // ─── Dispute edge cases ──────────────────────────────────────────────

    public function test_cannot_dispute_pending_payment(): void
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
            'total_fare' => 100.00,
        ]);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'amount' => 100.00,
            'method' => 'cash',
            'status' => 'pending',
            'category' => 'ride',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/payments/{$payment->id}/dispute", [
            'reason' => 'Not yet paid',
            'description' => 'Payment still pending',
        ]);

        $response->assertStatus(422);
    }

    // ─── Wallet deposit edge cases ───────────────────────────────────────

    public function test_cannot_deposit_zero_amount(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 0,
            'payment_method' => 'payfast',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_deposit_exceeding_max(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 1000001,
            'payment_method' => 'payfast',
        ]);

        $response->assertStatus(422);
    }
}
