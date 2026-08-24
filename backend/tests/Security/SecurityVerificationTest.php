<?php

declare(strict_types=1);

namespace Tests\Security;

use App\Models\Ride;
use App\Models\RideLocationLog;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * SECURITY VERIFICATION TEST SUITE
 *
 * Covers: Wallet self-confirmation, Fare manipulation, Mass assignment,
 * TOTP bypass, Ride participant authorization, GPS spoofing.
 *
 * Each test verifies that a specific attack vector is blocked.
 */
class SecurityVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
        Role::create(['name' => 'super-admin', 'guard_name' => 'web']);
    }

    // ─────────────────────────────────────────────────────────────────────
    // WALLET SECURITY TESTS
    // ─────────────────────────────────────────────────────────────────────

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
            'reference_type' => 'pending_topup',
            'description' => 'Pending deposit',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('errors.0.title', 'Forbidden');
    }

    public function test_wallet_confirm_does_not_credit_balance(): void
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
            'reference_type' => 'pending_topup',
            'description' => 'Pending deposit',
        ]);

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance, 'Balance must not change after blocked confirm');
    }

    public function test_wallet_deposit_creates_pending_transaction_only(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 250.00,
            'payment_method' => 'payfast',
        ]);

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance, 'Balance must NOT be credited on deposit initiation');

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'reference_type' => 'pending_topup',
            'amount' => 250.00,
        ]);
    }

    public function test_wallet_balance_unchanged_until_webhook_confirms(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 100.00,
        ]);

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 300.00,
            'payment_method' => 'payfast',
        ]);

        $wallet->refresh();
        $this->assertEquals(100.00, (float) $wallet->balance, 'Balance unchanged without webhook confirmation');

        $pendingBalance = (float) $wallet->pending_balance;
        $this->assertGreaterThan(0, $pendingBalance, 'Pending balance should reflect the deposit amount');
    }

    public function test_wallet_cannot_confirm_others_deposit(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $wallet1 = Wallet::create([
            'user_id' => $rider1->id,
            'balance' => 0.0,
        ]);

        $wallet2 = Wallet::create([
            'user_id' => $rider2->id,
            'balance' => 0.0,
        ]);

        $transaction = WalletTransaction::create([
            'wallet_id' => $wallet1->id,
            'type' => 'credit',
            'amount' => 200.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'reference_type' => 'pending_topup',
            'description' => 'Pending deposit',
        ]);

        // Rider2 tries to confirm Rider1's deposit
        Sanctum::actingAs($rider2);
        $response = $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        // Blocked: confirm endpoint is fully disabled for users
        $response->assertStatus(403);

        // Both balances remain 0
        $wallet1->refresh();
        $wallet2->refresh();
        $this->assertEquals(0.0, (float) $wallet1->balance);
        $this->assertEquals(0.0, (float) $wallet2->balance);
    }

    public function test_wallet_confirm_blocked_even_for_admin_user(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $wallet = Wallet::create([
            'user_id' => $admin->id,
            'balance' => 0.0,
        ]);

        $transaction = WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 999.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'reference_type' => 'pending_topup',
            'description' => 'Pending deposit',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => $transaction->id,
        ]);

        $response->assertStatus(403);
        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance);
    }

    public function test_wallet_rate_limit_on_confirm(): void
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
            'reference_type' => 'pending_topup',
            'description' => 'Pending deposit',
        ]);

        Sanctum::actingAs($rider);

        $hitRateLimit = false;
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/v1/wallet/confirm', [
                'transaction_id' => $transaction->id,
            ]);

            if ($response->status() === 429) {
                $hitRateLimit = true;
                break;
            }
        }

        $this->assertTrue($hitRateLimit, 'Rate limiter should block after repeated wallet confirm attempts');
    }

    // ─────────────────────────────────────────────────────────────────────
    // FARE MANIPULATION TESTS
    // ─────────────────────────────────────────────────────────────────────

    public function test_complete_ride_ignores_distance_km_from_driver(): void
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
            'distance_km' => 10.0,
            'duration_minutes' => 15.0,
        ]);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete", [
            'distance_km' => 999.99,
            'duration_minutes' => 999,
        ]);

        $response->assertStatus(200);
        $ride->refresh();
        $this->assertNotEquals(999.99, (float) $ride->distance_km, 'Driver-submitted distance_km must be ignored');
        $this->assertNotEquals(999.0, (float) $ride->duration_minutes, 'Driver-submitted duration_minutes must be ignored');
    }

    public function test_complete_ride_ignores_duration_minutes_from_driver(): void
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
            'distance_km' => 10.0,
            'duration_minutes' => 15.0,
        ]);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete", [
            'duration_minutes' => 0.01,
        ]);

        $response->assertStatus(200);
        $ride->refresh();
        $this->assertNotEquals(0.01, (float) $ride->duration_minutes, 'Driver-submitted duration must be ignored');
    }

    public function test_server_side_fare_calculation_populates_audit_log(): void
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

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $ride->refresh();
        $this->assertNotNull($ride->fare_calculation_log, 'fare_calculation_log must be populated');
        $log = is_string($ride->fare_calculation_log) ? json_decode($ride->fare_calculation_log, true) : $ride->fare_calculation_log;
        $this->assertIsArray($log);
        $this->assertArrayHasKey('method', $log);
        $this->assertArrayHasKey('estimated_fare_at_booking', $log);
        $this->assertArrayHasKey('calculated_fare', $log);
        $this->assertArrayHasKey('spoofed_points_detected', $log);
        $this->assertArrayHasKey('valid_points_used', $log);
    }

    public function test_server_calculated_distance_and_duration_stored(): void
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

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $ride->refresh();
        $this->assertNotNull($ride->server_calculated_distance_km);
        $this->assertNotNull($ride->server_calculated_duration_minutes);
    }

    public function test_fare_clamped_within_20_percent_of_estimate(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver = User::factory()->create([
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        $estimatedFare = 100.00;

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
            'total_fare' => $estimatedFare,
            'estimated_fare_at_booking' => $estimatedFare,
            'base_fare' => 45.00,
            'per_km_fare' => 15.00,
            'surge_multiplier' => 1.0,
        ]);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $ride->refresh();
        $finalFare = (float) $ride->total_fare;

        $maxAllowed = $estimatedFare * 1.20;
        $minAllowed = $estimatedFare * 0.80;

        $this->assertLessThanOrEqual($maxAllowed, $finalFare, "Fare {$finalFare} exceeds upper bound {$maxAllowed}");
        $this->assertGreaterThanOrEqual($minAllowed, $finalFare, "Fare {$finalFare} below lower bound {$minAllowed}");
    }

    public function test_gps_spoofing_speed_180kmh_detected(): void
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

        // First valid location
        $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => -23.9468,
            'longitude' => 29.4726,
        ]);

        // Backdate the first point so the second creates an impossible speed
        RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', false)
            ->update(['recorded_at' => now()->subMinutes(2)]);

        // Second location ~600km away (should exceed 180km/h if only 2 min elapsed)
        $this->postJson("/api/v1/rides/{$ride->id}/location", [
            'latitude' => -30.0000,
            'longitude' => 35.0000,
        ]);

        $spoofed = RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', true)
            ->where('spoof_reason', 'like', '%Impossible speed%')
            ->first();

        $this->assertNotNull($spoofed, 'GPS spoofing via speed > 180km/h must be detected');
    }

    public function test_gps_zero_coordinates_detected(): void
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
            'latitude' => 0.0,
            'longitude' => 0.0,
        ]);

        $spoofed = RideLocationLog::where('ride_id', $ride->id)
            ->where('is_spoofed', true)
            ->where('spoof_reason', 'Zero coordinates submitted')
            ->first();

        $this->assertNotNull($spoofed, 'Zero coordinates must be flagged as spoofed');
    }

    public function test_gps_out_of_range_coordinates_detected(): void
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
            'longitude' => 200.0,
        ]);

        $response->assertStatus(422);
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
            'estimated_fare_at_booking' => 150.00,
        ]);

        Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $response->assertStatus(422, 'Driver with zero coordinates cannot complete ride');
    }

    // ─────────────────────────────────────────────────────────────────────
    // MASS ASSIGNMENT TESTS
    // ─────────────────────────────────────────────────────────────────────

    public function test_role_removed_from_user_fillable(): void
    {
        $user = User::factory()->create(['role' => 'rider']);

        $reflection = new \ReflectionClass(User::class);
        $fillableProperty = $reflection->getProperty('fillable');
        $fillableProperty->setAccessible(true);
        $fillable = $fillableProperty->getValue($user);

        $this->assertNotContains('role', $fillable, 'role must NOT be in User $fillable');
        $this->assertNotContains('is_kyc_verified', $fillable, 'is_kyc_verified must NOT be in User $fillable');
        $this->assertNotContains('kyc_verified_at', $fillable, 'kyc_verified_at must NOT be in User $fillable');
        $this->assertNotContains('anonymized_at', $fillable, 'anonymized_at must NOT be in User $fillable');
        $this->assertNotContains('failed_attempts', $fillable, 'failed_attempts must NOT be in User $fillable');
        $this->assertNotContains('locked_until', $fillable, 'locked_until must NOT be in User $fillable');
    }

    public function test_mass_assignment_cannot_escalate_role_via_user_update(): void
    {
        $rider = User::factory()->create(['role' => 'rider']);
        $rider->assignRole('rider');

        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole('admin');

        // Admin updates the rider but includes 'role' in the payload
        // UserUpdateRequest only allows: name, email, phone_number, is_active
        // Even if 'role' gets past validation, the model $fillable blocks it
        Sanctum::actingAs($admin);
        $response = $this->putJson("/api/v1/users/{$rider->id}", [
            'role' => 'admin',
            'is_kyc_verified' => true,
            'name' => 'Hacked User',
        ]);

        // Should either be rejected by validation or silently ignored by $fillable
        $rider->refresh();
        $this->assertEquals('rider', $rider->role, 'Role must not change via mass assignment');
        $this->assertFalse((bool) $rider->is_kyc_verified, 'is_kyc_verified must not change via mass assignment');
    }

    public function test_mass_assignment_cannot_set_role_via_register(): void
    {
        // Attempt to register with a role — register() sets role to 'rider' regardless
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Evil User',
            'email' => 'evil_hacker_' . uniqid() . '@example.com',
            'phone_number' => '+27' . mt_rand(1000000000, 9999999999),
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'admin',
        ]);

        if ($response->status() === 201) {
            $user = User::where('email', 'evil_hacker_' . substr(json_decode($response->getContent())->data->user->email ?? '', 0))->first();
            if ($user) {
                $this->assertEquals('rider', $user->role, 'Registered user must always be rider, never admin');
            }
        } else {
            $this->assertContains($response->status(), [422, 403],
                'Registration with admin role must be rejected');
        }
    }

    public function test_rider_cannot_self_promote_via_users_update(): void
    {
        $rider = User::factory()->create(['role' => 'rider']);
        $rider->assignRole('rider');

        Sanctum::actingAs($rider);
        $response = $this->putJson("/api/v1/users/{$rider->id}", [
            'role' => 'admin',
            'is_active' => true,
        ]);

        // UserUpdateRequest requires admin role (authorize returns false for non-admins)
        $response->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOTP SECURITY TESTS
    // ─────────────────────────────────────────────────────────────────────

    public function test_totp_disable_requires_totp_code(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'totp_enabled' => true,
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
        ]);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);

        // Attempt to disable TOTP without providing a code
        $response = $this->postJson('/api/v1/admin/totp/disable', []);

        // Should fail validation or require TOTP verification
        $this->assertContains($response->status(), [422, 403],
            'TOTP disable without code must be rejected');
    }

    public function test_totp_disable_requires_admin_role(): void
    {
        $rider = User::factory()->create(['role' => 'rider']);
        $rider->assignRole('rider');

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/admin/totp/disable', [
            'code' => '123456',
        ]);

        $response->assertStatus(403, 'Non-admin must not access TOTP disable endpoint');
    }

    public function test_totp_enable_requires_admin_role(): void
    {
        $rider = User::factory()->create(['role' => 'rider']);
        $rider->assignRole('rider');

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/admin/totp/enable', []);

        $response->assertStatus(403, 'Non-admin must not access TOTP enable endpoint');
    }

    public function test_totp_verify_requires_admin_role(): void
    {
        $rider = User::factory()->create(['role' => 'rider']);
        $rider->assignRole('rider');

        Sanctum::actingAs($rider);
        $response = $this->postJson('/api/v1/admin/totp/verify', [
            'code' => '123456',
        ]);

        $response->assertStatus(403, 'Non-admin must not access TOTP verify endpoint');
    }

    public function test_totp_rate_limiting_on_enable_endpoint(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);

        $hitRateLimit = false;
        for ($i = 0; $i < 8; $i++) {
            $response = $this->postJson('/api/v1/admin/totp/enable', []);

            if ($response->status() === 429) {
                $hitRateLimit = true;
                break;
            }
        }

        $this->assertTrue($hitRateLimit, 'Rate limiter must trigger on repeated TOTP enable attempts (5/min)');
    }

    public function test_totp_rate_limiting_on_verify_endpoint(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);

        $hitRateLimit = false;
        for ($i = 0; $i < 8; $i++) {
            $response = $this->postJson('/api/v1/admin/totp/verify', [
                'code' => str_pad((string) $i, 6, '0'),
            ]);

            if ($response->status() === 429) {
                $hitRateLimit = true;
                break;
            }
        }

        $this->assertTrue($hitRateLimit, 'Rate limiter must trigger on repeated TOTP verify attempts (5/min)');
    }

    public function test_totp_disable_blocked_when_totp_not_enabled(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'totp_enabled' => false,
        ]);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/v1/admin/totp/disable', [
            'code' => '123456',
        ]);

        $response->assertStatus(400, 'Cannot disable TOTP when it is not enabled');
    }

    // ─────────────────────────────────────────────────────────────────────
    // RIDE PARTICIPANT AUTHORIZATION (API)
    // ─────────────────────────────────────────────────────────────────────

    public function test_rider_cannot_complete_another_riders_ride(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $driver = User::factory()->create([
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider1->id,
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

        // Rider2 (not participant) tries to complete the ride
        Sanctum::actingAs($rider2);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $response->assertStatus(403, 'Non-participant must not complete someone else ride');
    }

    public function test_unrelated_driver_cannot_start_another_drivers_ride(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $driver1 = User::factory()->create([
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver1->assignRole('driver');

        $driver2 = User::factory()->create([
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver2->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver1->id,
            'status' => 'arrived',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        // Driver2 (not the assigned driver) tries to start the ride
        Sanctum::actingAs($driver2);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/start");

        $response->assertStatus(403, 'Non-assigned driver must not start ride');
    }

    public function test_rider_cannot_access_other_riders_ride_details(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider1->id,
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

        Sanctum::actingAs($rider2);
        $response = $this->getJson("/api/v1/rides/{$ride->id}");

        $response->assertStatus(403, 'Rider must not see other riders ride details');
    }

    public function test_driver_role_required_for_ride_complete_endpoint(): void
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

        // Rider tries to hit driver-only complete endpoint
        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/complete");

        $response->assertStatus(403, 'Rider must not access driver-only complete endpoint');
    }

    public function test_driver_role_required_for_ride_start_endpoint(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'arrived',
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
        $response = $this->postJson("/api/v1/rides/{$ride->id}/start");

        $response->assertStatus(403, 'Rider must not access driver-only start endpoint');
    }

    // ─────────────────────────────────────────────────────────────────────
    // WEBHOOK IP VERIFICATION
    // ─────────────────────────────────────────────────────────────────────

    public function test_webhook_bypass_defaults_to_false(): void
    {
        $original = env('APP_WEBHOOK_BYPASS');
        putenv('APP_WEBHOOK_BYPASS');
        unset($_ENV['APP_WEBHOOK_BYPASS'], $_SERVER['APP_WEBHOOK_BYPASS']);
        config()->set('webhook_ips.bypass_in_local', env('APP_WEBHOOK_BYPASS', false));

        $this->assertFalse(config('webhook_ips.bypass_in_local'), 'Webhook bypass must default to false');

        if ($original !== false) {
            putenv('APP_WEBHOOK_BYPASS=' . $original);
            $_ENV['APP_WEBHOOK_BYPASS'] = $original;
            $_SERVER['APP_WEBHOOK_BYPASS'] = $original;
        }
        config()->set('webhook_ips.bypass_in_local', env('APP_WEBHOOK_BYPASS', false));
    }

    public function test_webhook_routes_have_ip_middleware(): void
    {
        $router = app('router');
        $routes = [
            'api/v1/webhooks/payfast',
            'api/v1/webhooks/ozow',
            'api/v1/webhooks/stripe',
            'api/v1/webhooks/twilio',
            'api/v1/webhooks/phbimh',
        ];

        foreach ($routes as $uri) {
            $route = $router->getRoutes()->match(
                \Illuminate\Http\Request::create('/' . $uri, 'POST')
            );

            $middleware = $route->gatherMiddleware();
            $hasWebhookIp = false;
            foreach ($middleware as $m) {
                if ($m === 'webhook.ip' || str_starts_with($m, 'webhook.ip:')) {
                    $hasWebhookIp = true;
                    break;
                }
            }
            $this->assertTrue($hasWebhookIp, "Route {$uri} must have webhook.ip middleware");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // WALLET AUDIT LOGGING
    // ─────────────────────────────────────────────────────────────────────

    public function test_wallet_audit_log_channel_exists(): void
    {
        $loggingConfig = config('logging.channels');
        $this->assertArrayHasKey('wallet-audit', $loggingConfig, 'wallet-audit log channel must be configured');
    }

    public function test_wallet_deposit_creates_pending_only_no_balance_credit(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $wallet = Wallet::create([
            'user_id' => $rider->id,
            'balance' => 0.0,
        ]);

        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 500.00,
            'payment_method' => 'payfast',
        ]);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'reference_type' => 'pending_topup',
            'amount' => 500.00,
        ]);

        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'reference_type' => 'topup_confirmed',
        ]);

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance);
    }

    // ─────────────────────────────────────────────────────────────────────
    // UNAUTHENTICATED ACCESS
    // ─────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_call_wallet_confirm(): void
    {
        $response = $this->postJson('/api/v1/wallet/confirm', [
            'transaction_id' => 'fake-id',
        ]);

        $response->assertStatus(401, 'Unauthenticated user must not call wallet confirm');
    }

    public function test_unauthenticated_cannot_call_ride_complete(): void
    {
        $response = $this->postJson('/api/v1/rides/fake-id/complete');

        $response->assertStatus(401, 'Unauthenticated user must not call ride complete');
    }

    public function test_unauthenticated_cannot_call_totp_endpoints(): void
    {
        $endpoints = [
            ['POST', '/api/v1/admin/totp/enable'],
            ['POST', '/api/v1/admin/totp/verify'],
            ['POST', '/api/v1/admin/totp/disable'],
        ];

        foreach ($endpoints as [$method, $uri]) {
            $response = $this->json($method, $uri, ['code' => '123456']);
            $response->assertStatus(401, "Unauthenticated user must not access {$uri}");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // DEFENSE IN DEPTH — CONCURRENT ATTACKS
    // ─────────────────────────────────────────────────────────────────────

    public function test_wallet_confirm_multiple_attempts_all_fail(): void
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
            'amount' => 1000.00,
            'balance_before' => 0.0,
            'balance_after' => 0.0,
            'reference_type' => 'pending_topup',
            'description' => 'Pending deposit',
        ]);

        Sanctum::actingAs($rider);

        // Try to confirm 10 times — all should return 403
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/v1/wallet/confirm', [
                'transaction_id' => $transaction->id,
            ]);

            if ($response->status() !== 403 && $response->status() !== 429) {
                $this->fail("Attempt #{$i}: Expected 403 or 429, got {$response->status()}");
            }
        }

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance, 'Balance must remain 0 after all confirm attempts');
    }

    public function test_ride_complete_rejects_non_participant_consistently(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $driver = User::factory()->create([
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        $ride = Ride::create([
            'rider_id' => $rider1->id,
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

        Sanctum::actingAs($rider2);

        // Multiple attempts by non-participant — all must fail
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson("/api/v1/rides/{$ride->id}/complete", [
                'distance_km' => 0,
                'duration_minutes' => 0,
            ]);

            $response->assertStatus(403);
        }

        $ride->refresh();
        $this->assertEquals('in_progress', $ride->status->value, 'Ride must not be completed by non-participant');
    }
}
