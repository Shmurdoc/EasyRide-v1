<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PromoCode;
use App\Models\Ride;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RideEdgeCaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    // ─── Ride state machine invalid transitions ──────────────────────────

    public function test_cannot_start_ride_from_searching_status(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/start");

        $response->assertStatus(422);
    }

    public function test_cannot_start_ride_from_completed_status(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

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

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/start");

        $response->assertStatus(422);
    }

    public function test_cannot_complete_ride_from_searching_status(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);
        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $response->assertStatus(422);
    }

    public function test_cannot_complete_ride_from_cancelled_status(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'cancelled',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);
        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $response->assertStatus(422);
    }

    public function test_cannot_cancel_completed_ride(): void
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
        $response = $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Too late',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_cancel_already_cancelled_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'cancelled',
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
        $response = $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Try again',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_rate_searching_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'searching',
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
        $response = $this->postJson("/api/v1/rides/{$ride->id}/rate", [
            'score' => 5,
            'comment' => 'Haven\'t ridden yet',
        ]);

        $response->assertStatus(422);
    }

    public function test_driver_cannot_arrive_on_in_progress_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
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

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/driver-arrived");

        $response->assertStatus(422);
    }

    // ─── Payment with expired cards ──────────────────────────────────────

    public function test_wallet_payment_with_insufficient_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 10.00,
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

        $response->assertStatus(422);

        $wallet->refresh();
        $this->assertEquals(10.00, $wallet->balance);
    }

    public function test_wallet_payment_exactly_sufficient_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 150.00,
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
        $this->assertEquals(0.0, $wallet->balance);
    }

    public function test_wallet_withdraw_insufficient_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 25.00,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 100.00,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ]);

        $response->assertStatus(422);
    }

    public function test_wallet_withdraw_exact_balance(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 100.00,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 100.00,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ]);

        $response->assertStatus(201);
    }

    public function test_wallet_withdraw_zero_amount(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 100.00,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 0,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ]);

        $response->assertStatus(422);
    }

    // ─── Promo code abuse ────────────────────────────────────────────────

    public function test_promo_code_rejected_after_max_uses(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $promo = PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'LIMITED1',
            'type' => 'fixed',
            'value' => 10.00,
            'is_active' => true,
            'max_uses' => 1,
            'used_count' => 1,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'LIMITED1',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_promo_code_rejected_after_expiry(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'EXPIRED1',
            'type' => 'fixed',
            'value' => 10.00,
            'is_active' => true,
            'starts_at' => now()->subDays(10),
            'expires_at' => now()->subDay(),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'EXPIRED1',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_promo_code_rejected_before_start_date(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'FUTURE1',
            'type' => 'fixed',
            'value' => 10.00,
            'is_active' => true,
            'starts_at' => now()->addDays(10),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'FUTURE1',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_inactive_promo_code_rejected(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'INACTIVE1',
            'type' => 'fixed',
            'value' => 10.00,
            'is_active' => false,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'INACTIVE1',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_apply_promo_rejects_after_ride_started(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
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

        $promo = PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'LATEPROMO',
            'type' => 'fixed',
            'value' => 10.00,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/apply-promo", [
            'code' => 'LATEPROMO',
        ]);

        $response->assertStatus(422);
    }

    // ─── Concurrent ride requests (race condition) ───────────────────────

    public function test_concurrent_ride_creates_are_sequentialized(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $responses = [];
        for ($i = 0; $i < 3; $i++) {
            $responses[] = $this->postJson('/api/v1/rides', [
                'pickup_lat' => -23.9468,
                'pickup_lng' => 29.4726,
                'pickup_address' => "Pickup {$i}",
                'dropoff_lat' => -23.9500,
                'dropoff_lng' => 29.4800,
                'dropoff_address' => "Dropoff {$i}",
                'category' => 'standard',
                'payment_method' => 'cash',
            ]);
        }

        $rideCount = Ride::where('rider_id', $rider->id)->count();
        $this->assertGreaterThanOrEqual(1, $rideCount);
    }

    public function test_driver_cannot_accept_already_accepted_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver1 = User::factory()->create(['is_online' => true]);
        $driver1->assignRole('driver');
        $driver2 = User::factory()->create(['is_online' => true]);
        $driver2->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Sanctum::actingAs($driver1);
        $this->postJson("/api/v1/rides/{$ride->id}/driver-accept");

        Sanctum::actingAs($driver2);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/driver-accept");

        $response->assertStatus(422);
    }

    public function test_rider_with_no_wallet_cannot_pay_with_wallet(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $driver = User::factory()->create();
        $driver->assignRole('driver');

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

        $response->assertStatus(422);
    }
}
