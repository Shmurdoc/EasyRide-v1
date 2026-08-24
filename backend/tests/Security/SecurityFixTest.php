<?php

namespace Tests\Security;

use App\Models\IncidentReport;
use App\Models\PoolPassenger;
use App\Models\PoolRide;
use App\Models\PromoCode;
use App\Models\Ride;
use App\Models\RideLocationLog;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SecurityFixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    // ─── Wallet Confirm 403 for direct user calls ────────────────────────

    public function test_wallet_confirm_returns_403_for_direct_user_call(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        $transaction = WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 100.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'description' => 'Pending deposit',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_wallet_confirm_logs_security_warning(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        $transaction = WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 100.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'description' => 'Pending deposit',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('errors.0.title', 'Forbidden');
    }

    public function test_wallet_balance_unchanged_after_blocked_confirm(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        $transaction = WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 500.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'description' => 'Pending deposit',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        $wallet->refresh();
        $this->assertEquals(0.0, $wallet->balance);
    }

    // ─── Ride complete no longer accepts distance/duration from driver ────

    public function test_complete_ride_ignores_driver_submitted_distance(): void
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
            'estimated_fare_at_booking' => 150.00,
            'base_fare' => 45.00,
            'per_km_fare' => 15.00,
            'surge_multiplier' => 1.0,
        ]);

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete", [
            'distance_km' => 999.99,
            'duration_minutes' => 999,
        ]);

        $response->assertStatus(200);
        $ride->refresh();
        $this->assertNotEquals(999.99, (float) $ride->distance_km);
    }

    public function test_complete_ride_ignores_driver_submitted_duration(): void
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
            'estimated_fare_at_booking' => 150.00,
            'base_fare' => 45.00,
            'per_km_fare' => 15.00,
            'surge_multiplier' => 1.0,
        ]);

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete", [
            'duration_minutes' => 999,
        ]);

        $response->assertStatus(200);
        $ride->refresh();
        $this->assertNotEquals(999, (float) $ride->duration_minutes);
    }

    // ─── Server-side fare calculation ────────────────────────────────────

    public function test_server_side_fare_calculation_uses_own_values(): void
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
            'estimated_fare_at_booking' => 150.00,
            'base_fare' => 45.00,
            'per_km_fare' => 15.00,
            'surge_multiplier' => 1.0,
        ]);

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $ride->refresh();
        $this->assertNotNull($ride->server_calculated_distance_km);
        $this->assertNotNull($ride->server_calculated_duration_minutes);
        $this->assertNotNull($ride->fare_calculation_log);
        $this->assertNotNull($ride->total_fare);
    }

    public function test_fare_calculation_log_contains_method(): void
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
            'estimated_fare_at_booking' => 150.00,
            'base_fare' => 45.00,
            'per_km_fare' => 15.00,
            'surge_multiplier' => 1.0,
        ]);

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $ride->refresh();
        $log = is_string($ride->fare_calculation_log) ? json_decode($ride->fare_calculation_log, true) : $ride->fare_calculation_log;
        $this->assertIsArray($log);
        $this->assertArrayHasKey('method', $log);
        $this->assertArrayHasKey('distance_km', $log);
        $this->assertArrayHasKey('duration_minutes', $log);
        $this->assertArrayHasKey('spoofed_points_detected', $log);
        $this->assertArrayHasKey('valid_points_used', $log);
        $this->assertArrayHasKey('calculated_fare', $log);
    }

    public function test_server_side_fare_applies_minimum_fare(): void
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
            'driver_id' => $driver->id,
            'status' => 'in_progress',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 10.00,
            'estimated_fare_at_booking' => 10.00,
            'base_fare' => 45.00,
            'per_km_fare' => 15.00,
            'surge_multiplier' => 1.0,
        ]);

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $ride->refresh();
        $this->assertGreaterThanOrEqual(65.0, (float) $ride->total_fare);
    }

    // ─── GPS spoofing detection ──────────────────────────────────────────

    public function test_zero_coordinates_marked_as_spoofed(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

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

        $driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($driver);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => 0.0,
            'longitude' => 0.0,
        ]);

        $log = RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', true)
            ->where('spoof_reason', 'Zero coordinates submitted')
            ->first();

        $this->assertNotNull($log);
    }

    public function test_out_of_range_coordinates_marked_as_spoofed(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

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

        $driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($driver);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => 91.0,
            'longitude' => 29.4726,
        ]);

        $response->assertStatus(422);
    }

    public function test_impossible_speed_detected_as_spoofing(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

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

        $driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($driver);

        $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => -23.9468,
            'longitude' => 29.4726,
        ]);

        RideLocationLog::where('ride_id', $ride->id)->update(['recorded_at' => now()->subMinutes(1)]);

        $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => -30.0000,
            'longitude' => 35.0000,
        ]);

        $spoofed = RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', true)
            ->where('spoof_reason', 'like', '%Impossible speed%')
            ->first();

        $this->assertNotNull($spoofed);
    }

    public function test_valid_location_not_marked_spoofed(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

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

        $driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($driver);

        $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => -23.9468,
            'longitude' => 29.4726,
        ]);

        $log = RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', false)
            ->first();

        $this->assertNotNull($log);
    }

    public function test_driver_cannot_complete_ride_with_zero_location(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create([
            'current_latitude' => 0.0,
            'current_longitude' => 0.0,
        ]);
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

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500.00,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $response->assertStatus(422);
    }
}
