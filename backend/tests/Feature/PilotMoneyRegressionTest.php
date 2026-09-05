<?php

namespace Tests\Feature;

use App\Models\Ride;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * TASK-QA-001 (wave 1) — real-money ride pilot regression guards.
 *
 * Black-box only: existing HTTP APIs, no src changes.
 * Covers the highest-value gaps found in the pilot edge-case matrix:
 *   1. unapproved-driver-goes-online
 *   2. double payout (withdraw) request
 *   3. cancel-during-pickup refund/fee path
 * Plus: unapproved/offline accept guards, offline-mid-trip behaviour lock,
 * and a full accept→arrived→start→complete→wallet-pay lifecycle.
 */
class PilotMoneyRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function makeRider(): User
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        return $rider;
    }

    private function makeDriver(array $attributes = [], bool $approved = true): User
    {
        $driver = User::factory()->create($attributes);
        $driver->assignRole('driver');
        $driver->driverProfile()->create([
            'is_approved' => $approved,
            'is_verified' => $approved,
        ]);

        return $driver->fresh();
    }

    private function withdrawPayload(float $amount): array
    {
        return [
            'amount' => $amount,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ];
    }

    // ─── 1. Unapproved driver cannot go online ────────────────────────────

    public function test_unapproved_driver_cannot_go_online(): void
    {
        $driver = $this->makeDriver(['is_online' => false], approved: false);
        Sanctum::actingAs($driver);

        $response = $this->postJson('/api/v1/drivers/toggle-online', [
            'is_online' => true,
        ]);

        $response->assertStatus(403);
        $this->assertFalse($driver->fresh()->is_online);
    }

    public function test_approved_driver_can_still_go_online(): void
    {
        $driver = $this->makeDriver(['is_online' => false], approved: true);
        Sanctum::actingAs($driver);

        $response = $this->postJson('/api/v1/drivers/toggle-online', [
            'is_online' => true,
        ]);

        $response->assertStatus(200);
        $this->assertTrue($driver->fresh()->is_online);
    }

    // ─── 2. Unapproved / offline driver cannot accept rides ───────────────

    public function test_unapproved_driver_cannot_accept_ride(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ], approved: false);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9500,
            'pickup_longitude' => 29.4800,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/driver-accept");

        $response->assertStatus(422);
        $this->assertDatabaseHas('rides', ['id' => $ride->id, 'status' => 'searching']);
    }

    public function test_offline_driver_cannot_accept_ride(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver([
            'is_online' => false,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ], approved: true);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9500,
            'pickup_longitude' => 29.4800,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Sanctum::actingAs($driver);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/driver-accept");

        $response->assertStatus(422);
        $this->assertDatabaseHas('rides', ['id' => $ride->id, 'status' => 'searching']);
    }

    // ─── 3. Double payout (withdraw) request ──────────────────────────────

    public function test_double_withdrawal_second_rejected_and_balance_never_negative(): void
    {
        $rider = $this->makeRider();
        Wallet::create(['user_id' => $rider->id, 'balance' => 100.00]);

        Sanctum::actingAs($rider);

        $first = $this->postJson('/api/v1/wallet/withdraw', $this->withdrawPayload(60.00));
        $first->assertStatus(201);

        // Same request replayed (double-click / retry): must not overdraw.
        $second = $this->postJson('/api/v1/wallet/withdraw', $this->withdrawPayload(60.00));
        $second->assertStatus(422);

        $balance = (float) Wallet::where('user_id', $rider->id)->first()->balance;
        $this->assertEquals(40.00, $balance);
        $this->assertGreaterThanOrEqual(0, $balance);

        $this->assertEquals(
            1,
            Wallet::where('user_id', $rider->id)->first()
                ->transactions()->where('reference_type', 'withdrawal')->where('amount', 60.00)->count()
        );
    }

    // ─── 4. Cancel-during-pickup refund/fee path ──────────────────────────

    public function test_rider_cancel_en_route_records_fee_frees_driver_no_wallet_movement(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver(['is_online' => true], approved: true);

        $wallet = Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'driver_en_route',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 200.00,
        ]);
        $driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Driver taking too long',
        ]);

        $response->assertStatus(200);

        $ride->refresh();
        $this->assertEquals('cancelled', $ride->status instanceof \BackedEnum ? $ride->status->value : $ride->status);
        // 10% of 200 = 20 recorded as fee; no wallet charge on pre-completion cancel.
        $this->assertEquals(20.00, (float) $ride->cancellation_fee);
        $this->assertEquals(500.00, (float) $wallet->fresh()->balance);
        $this->assertNull($driver->fresh()->current_ride_id);
        $this->assertDatabaseMissing('payments', ['ride_id' => $ride->id]);
    }

    public function test_rider_cancel_after_arrival_records_fee(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver(['is_online' => true], approved: true);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
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
        $driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Found another ride',
        ]);

        $response->assertStatus(200);

        $ride->refresh();
        $this->assertEquals('cancelled', $ride->status instanceof \BackedEnum ? $ride->status->value : $ride->status);
        $this->assertEquals(15.00, (float) $ride->cancellation_fee);
        $this->assertNull($driver->fresh()->current_ride_id);
    }

    // ─── 5. Driver offline mid-trip must not strand/cancel the ride ───────

    public function test_driver_offline_mid_trip_does_not_cancel_ride(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver(['is_online' => true], approved: true);

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
        $response = $this->postJson('/api/v1/drivers/toggle-online', [
            'is_online' => false,
        ]);

        $response->assertStatus(200);
        $this->assertFalse($driver->fresh()->is_online);

        // Trip itself must survive the driver going offline (no auto-cancel).
        $ride->refresh();
        $this->assertEquals('in_progress', $ride->status instanceof \BackedEnum ? $ride->status->value : $ride->status);
        $this->assertEquals($driver->id, $ride->driver_id);
    }

    // ─── 6. Full pilot lifecycle: accept → arrived → start → complete → pay

    public function test_full_pilot_lifecycle_accept_to_wallet_payment(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver([
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ], approved: true);

        $wallet = Wallet::create(['user_id' => $rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($rider);
        $create = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9500,
            'pickup_lng' => 29.4800,
            'pickup_address' => '123 Main St',
            'dropoff_lat' => -23.9600,
            'dropoff_lng' => 29.4900,
            'dropoff_address' => '456 Oak Ave',
            'category' => 'standard',
            'payment_method' => 'wallet',
        ]);
        $create->assertStatus(201);
        $rideId = $create->json('ride.id');
        $this->assertNotNull($rideId);

        Sanctum::actingAs($driver);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept")->assertStatus(200);
        $this->postJson("/api/v1/rides/{$rideId}/driver-arrived")->assertStatus(200);
        $this->postJson("/api/v1/rides/{$rideId}/start")->assertStatus(200);
        $this->postJson("/api/v1/rides/{$rideId}/complete")->assertStatus(200);

        $fare = (float) Ride::find($rideId)->total_fare;
        $this->assertGreaterThan(0, $fare);

        Sanctum::actingAs($rider);
        $this->postJson("/api/v1/payments/rides/{$rideId}/pay", [
            'payment_method' => 'wallet',
        ])->assertStatus(201);

        // Real-money assertion: rider debited exactly the final fare, never below zero.
        $balance = (float) $wallet->fresh()->balance;
        $this->assertEquals(round(500.00 - $fare, 2), round($balance, 2));
        $this->assertGreaterThanOrEqual(0, $balance);
        $this->assertDatabaseHas('payments', ['ride_id' => $rideId]);
        $this->assertDatabaseHas('rides', ['id' => $rideId, 'status' => 'completed']);
    }
}
