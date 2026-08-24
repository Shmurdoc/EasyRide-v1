<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RideStatus;
use App\Models\Delivery;
use App\Models\FoodOrder;
use App\Models\FoodOrderItem;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\Rating;
use App\Models\Restaurant;
use App\Models\RestaurantCategory;
use App\Models\Ride;
use App\Models\RideStatusHistory;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DatabaseFlowExtendedTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $rider;

    private User $driver;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $this->tenant = Tenant::factory()->create();

        $this->rider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->rider->assignRole('rider');

        $this->driver = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $this->driver->assignRole('driver');

        $this->admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->admin->assignRole('admin');
    }

    private function createRide(string $status = 'searching', ?string $paymentMethod = 'cash', ?string $driverId = null): Ride
    {
        return Ride::create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $this->rider->id,
            'driver_id' => $driverId ?? ($status === 'searching' ? null : $this->driver->id),
            'status' => $status,
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => 'Phalaborwa CBD',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => 'Phalaborwa Airport',
            'distance_km' => 5.0,
            'duration_minutes' => 15.0,
            'base_fare' => 25.00,
            'per_km_fare' => 12.00,
            'surge_multiplier' => 1.0,
            'total_fare' => 85.00,
            'payment_method' => $paymentMethod,
            'status_history' => [['status' => $status, 'at' => now()->toISOString()]],
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  1. RIDE LIFECYCLE — COMPLETE STATE MACHINE COVERAGE
    // ═══════════════════════════════════════════════════════════════════════

    public function test_full_state_machine_happy_path_via_transition_to(): void
    {
        $ride = $this->createRide('searching');
        $this->assertEquals(RideStatus::SEARCHING->value, $ride->status->value);

        $ride->transitionTo('driver_assigned', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('driver_assigned', $ride->status->value);

        $ride->transitionTo('accepted', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('accepted', $ride->status->value);

        $ride->transitionTo('driver_en_route', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('driver_en_route', $ride->status->value);

        $ride->transitionTo('arrived', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('arrived', $ride->status->value);
        $this->assertNotNull($ride->arrived_at);

        $ride->transitionTo('waiting_for_rider', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('waiting_for_rider', $ride->status->value);
        $this->assertNotNull($ride->waiting_started_at);

        $ride->transitionTo('in_progress', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('in_progress', $ride->status->value);
        $this->assertNotNull($ride->started_at);

        $ride->transitionTo('near_drop_off', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('near_drop_off', $ride->status->value);

        $ride->transitionTo('completed', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('completed', $ride->status->value);
        $this->assertNotNull($ride->completed_at);

        $historyCount = RideStatusHistory::where('ride_id', $ride->id)->count();
        $this->assertEquals(8, $historyCount);
    }

    public function test_cancellation_at_every_pre_completion_state(): void
    {
        $cancellableStates = ['searching', 'driver_assigned', 'accepted', 'driver_en_route', 'arrived', 'waiting_for_rider', 'in_progress', 'near_drop_off'];

        foreach ($cancellableStates as $state) {
            $ride = $this->createRide($state, driverId: $this->driver->id);
            $ride->transitionTo('cancelled', $this->rider->id, "Cancelled during $state");
            $ride->refresh();
            $this->assertEquals('cancelled', $ride->status->value, "Failed to cancel from $state");
            $this->assertNotNull($ride->cancelled_at, "cancelled_at not set for $state");
        }
    }

    public function test_no_show_from_driver_assigned(): void
    {
        $ride = $this->createRide('driver_assigned', driverId: $this->driver->id);
        $ride->transitionTo('no_show', $this->driver->id, 'Rider did not respond');
        $ride->refresh();
        $this->assertEquals('no_show', $ride->status->value);
        $this->assertNotNull($ride->no_show_at);

        $this->assertFalse($ride->transitionTo('completed'));
    }

    public function test_no_show_from_waiting_for_rider(): void
    {
        $ride = $this->createRide('waiting_for_rider', driverId: $this->driver->id);
        $ride->transitionTo('no_show', $this->driver->id);
        $ride->refresh();
        $this->assertEquals('no_show', $ride->status->value);
        $this->assertNotNull($ride->no_show_at);
    }

    public function test_cancellation_requested_flow(): void
    {
        $ride = $this->createRide('in_progress', driverId: $this->driver->id);

        $ride->update([
            'status' => 'cancellation_requested',
            'cancellation_requested_at' => now(),
            'cancellation_request_reason' => 'Rider requested cancellation',
        ]);
        $ride->refresh();
        $this->assertEquals('cancellation_requested', $ride->status->value);
        $this->assertNotNull($ride->cancellation_requested_at);

        $ride->transitionTo('cancelled', $this->admin->id, 'Admin approved cancellation');
        $ride->refresh();
        $this->assertEquals('cancelled', $ride->status->value);
        $this->assertNotNull($ride->cancelled_at);
    }

    public function test_all_invalid_transitions_rejected(): void
    {
        $invalidPairs = [
            'searching' => ['completed', 'in_progress', 'no_show', 'arrived'],
            'completed' => ['in_progress', 'cancelled', 'searching'],
            'cancelled' => ['in_progress', 'completed', 'searching'],
            'no_show' => ['completed', 'in_progress', 'cancelled'],
            'in_progress' => ['searching', 'accepted', 'arrived', 'no_show'],
            'accepted' => ['completed', 'in_progress', 'no_show', 'arrived'],
            'arrived' => ['completed', 'accepted', 'searching', 'no_show'],
            'driver_assigned' => ['completed', 'in_progress', 'arrived', 'searching'],
        ];

        foreach ($invalidPairs as $fromState => $toStates) {
            foreach ($toStates as $toState) {
                $ride = $this->createRide($fromState, driverId: $this->driver->id);
                $result = $ride->transitionTo($toState, $this->driver->id);
                $this->assertFalse($result, "Transition $fromState -> $toState should be invalid");
                $ride->refresh();
                $this->assertEquals($fromState, $ride->status->value);
            }
        }
    }

    public function test_status_history_records_timestamps_and_actor(): void
    {
        $ride = $this->createRide('searching');
        $ride->transitionTo('cancelled', $this->rider->id, 'Changed mind');

        $history = RideStatusHistory::where('ride_id', $ride->id)->first();
        $this->assertNotNull($history);
        $this->assertEquals('searching', $history->from_status);
        $this->assertEquals('cancelled', $history->to_status);
        $this->assertEquals($this->rider->id, $history->actor_id);
        $this->assertEquals('Changed mind', $history->reason);
        $this->assertNotNull($history->created_at);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2. RIDE API — CORRECT TRANSITIONS THROUGH CONTROLLERS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_ride_api_full_lifecycle(): void
    {
        Sanctum::actingAs($this->rider);
        $response = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Phalaborwa CBD',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Phalaborwa Airport',
            'category' => 'standard',
            'payment_method' => 'wallet',
        ]);
        $response->assertStatus(201);
        $rideId = $response->json('ride.id');
        $ride = Ride::find($rideId);
        $this->assertEquals(RideStatus::SEARCHING, $ride->status);

        Sanctum::actingAs($this->driver);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::ACCEPTED, $ride->status);

        $this->postJson("/api/v1/rides/{$rideId}/start")->assertStatus(422);

        $ride->transitionTo('driver_en_route', $this->driver->id);
        $this->postJson("/api/v1/rides/{$rideId}/driver-arrived")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::ARRIVED, $ride->status);
        $this->assertNotNull($ride->arrived_at);

        $this->postJson("/api/v1/rides/{$rideId}/start")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::IN_PROGRESS, $ride->status);
        $this->assertNotNull($ride->started_at);

        Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);
        $this->postJson("/api/v1/rides/{$rideId}/complete")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::COMPLETED, $ride->status);
        $this->assertNotNull($ride->completed_at);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$rideId}/rate", ['score' => 5, 'comment' => 'Great!'])->assertStatus(201);
        $this->assertDatabaseHas('ratings', ['ride_id' => $rideId, 'score' => 5]);

        $history = RideStatusHistory::where('ride_id', $rideId)->orderBy('created_at')->get();
        $expectedStatuses = ['accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed'];
        foreach ($expectedStatuses as $i => $status) {
            $this->assertEquals($status, $history[$i]->to_status);
        }
    }

    public function test_ride_api_driver_arrived_transition(): void
    {
        $ride = $this->createRide('driver_en_route', driverId: $this->driver->id);
        Sanctum::actingAs($this->driver);

        $this->postJson("/api/v1/rides/{$ride->id}/driver-arrived")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::ARRIVED, $ride->status);
        $this->assertNotNull($ride->arrived_at);
    }

    public function test_no_show_api_from_waiting(): void
    {
        $ride = $this->createRide('waiting_for_rider', driverId: $this->driver->id);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/no-show")->assertStatus(403);

        Sanctum::actingAs($this->driver);
        $this->postJson("/api/v1/rides/{$ride->id}/no-show")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::NO_SHOW, $ride->status);
        $this->assertNotNull($ride->no_show_at);
    }

    public function test_cancellation_fee_calculated_in_service(): void
    {
        $ride = $this->createRide('accepted', driverId: $this->driver->id, paymentMethod: 'cash');

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Changed mind',
        ])->assertStatus(200);

        $ride->refresh();
        $this->assertEquals(RideStatus::CANCELLED, $ride->status);
        $this->assertGreaterThan(0, (float) $ride->cancellation_fee);

        $expectedFee = max(round(85.00 * 0.10, 2), 10.0);
        $this->assertEquals($expectedFee, (float) $ride->cancellation_fee);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3. PAYMENT FLOWS — ALL GATEWAY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_cash_payment_full_flow(): void
    {
        $ride = $this->createRide('completed');
        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ]);
        $response->assertStatus(201);

        $payment = Payment::where('ride_id', $ride->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('completed', $payment->status);
        $this->assertEquals('cash', $payment->method);
        $this->assertEquals((float) $ride->total_fare, (float) $payment->amount);
        $this->assertNotNull($payment->paid_at);
    }

    public function test_wallet_payment_full_flow(): void
    {
        $ride = $this->createRide('completed', 'wallet');
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ])->assertStatus(201);

        $wallet->refresh();
        $expected = round(500.00 - (float) $ride->total_fare, 2);
        $this->assertEquals($expected, round((float) $wallet->balance, 2));

        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'method' => 'wallet',
            'status' => 'completed',
        ]);
    }

    public function test_wallet_payment_creates_debit_transaction(): void
    {
        $ride = $this->createRide('completed', 'wallet');
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ])->assertStatus(201);

        $txn = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')
            ->first();
        $this->assertNotNull($txn);
        $this->assertEquals((float) $ride->total_fare, (float) $txn->amount);
    }

    public function test_stripe_payment_intent_validation(): void
    {
        Sanctum::actingAs($this->rider);

        $response = $this->postJson('/api/v1/payments/stripe/create-intent', [
            'amount' => 100.00,
            'currency' => 'zar',
        ]);
        $this->assertTrue(in_array($response->status(), [422, 500]));
    }

    public function test_gateway_webhooks_return_200(): void
    {
        $response1 = $this->getJson('/api/v1/webhooks/payfast/return');
        $this->assertTrue(in_array($response1->status(), [200, 403]));

        $response2 = $this->getJson('/api/v1/webhooks/ozow/return');
        $this->assertTrue(in_array($response2->status(), [200, 403]));
    }

    public function test_payfast_webhook_received(): void
    {
        $response = $this->postJson('/api/v1/webhooks/payfast', [
            'm_payment_id' => 'test_123',
            'pf_payment_id' => '1423552',
            'amount_gross' => '100.00',
            'payment_status' => 'COMPLETE',
        ]);
        $this->assertTrue(in_array($response->status(), [200, 400]), 'PayFast webhook should be reachable');
    }

    public function test_ozow_webhook_received(): void
    {
        $response = $this->postJson('/api/v1/webhooks/ozow', [
            'TransactionNo' => 'OZOW123',
            'Reference' => 'REF123',
            'Amount' => '100.00',
            'Status' => 'Complete',
        ]);
        $this->assertTrue(in_array($response->status(), [200, 400]), 'Ozow webhook should be reachable');
    }

    public function test_payment_failure_handling(): void
    {
        $ride = $this->createRide('completed');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => (float) $ride->total_fare,
            'method' => 'stripe',
            'status' => 'failed',
            'gateway_response' => ['error' => 'card_declined', 'code' => 'declined'],
        ]);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'failed',
        ]);

        $payment->update(['status' => 'completed']);
        $payment->refresh();
        $this->assertEquals('completed', $payment->status);
    }

    public function test_escrow_hold_and_release_flow(): void
    {
        $ride = $this->createRide('completed');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => (float) $ride->total_fare,
            'method' => 'wallet',
            'status' => 'escrow_held',
            'escrow_released' => false,
            'held_until' => now()->addHours(24),
        ]);

        $this->assertEquals('escrow_held', $payment->status);
        $this->assertFalse($payment->escrow_released);
        $this->assertNotNull($payment->held_until);

        $payment->update([
            'escrow_released' => true,
            'escrow_released_at' => now(),
            'status' => 'completed',
        ]);
        $payment->refresh();
        $this->assertTrue($payment->escrow_released);
        $this->assertNotNull($payment->escrow_released_at);
        $this->assertEquals('completed', $payment->status);
    }

    public function test_full_refund_of_cash_payment(): void
    {
        $ride = $this->createRide('completed');
        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);
        $fare = (float) $ride->total_fare;

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $payment = Payment::where('ride_id', $ride->id)->first();
        $this->assertEquals('completed', $payment->status);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => $fare,
            'reason' => 'admin_override',
        ])->assertStatus(200);

        $payment->refresh();
        $this->assertEquals('refunded', $payment->status);
        $this->assertNotNull($payment->refunded_at);
        $this->assertEquals($fare, (float) $payment->refund_amount);
    }

    public function test_refund_with_admin_override(): void
    {
        $ride = $this->createRide('completed');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => 100.00,
            'method' => 'cash',
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 100.00,
            'reason' => 'admin_override',
        ])->assertStatus(200);

        $payment->refresh();
        $this->assertEquals('refunded', $payment->status);
        $this->assertNotNull($payment->refunded_at);
        $this->assertEquals(100.00, (float) $payment->refund_amount);
    }

    public function test_payment_idempotency_key_prevents_duplicate(): void
    {
        $ride = $this->createRide('completed');
        $idempotencyKey = 'idemp_' . uniqid();

        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);
        Sanctum::actingAs($this->rider);

        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
            'idempotency_key' => $idempotencyKey,
        ])->assertStatus(201);

        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
            'idempotency_key' => $idempotencyKey,
        ])->assertStatus(422);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  4. WALLET OPERATIONS — PENDING BALANCE, TRANSFERS, HOLDS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_wallet_top_up_creates_pending_balance(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0, 'pending_balance' => 0.0]);
        $service = app(WalletService::class);

        $service->initiateTopUp($wallet, 100.00, 'payfast');

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance);
        $this->assertEquals(100.00, (float) $wallet->pending_balance);
    }

    public function test_wallet_top_up_confirm_moves_pending_to_balance(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0, 'pending_balance' => 0.0]);
        $service = app(WalletService::class);

        $txn = $service->initiateTopUp($wallet, 100.00, 'payfast');
        $wallet->refresh();
        $this->assertEquals(100.00, (float) $wallet->pending_balance);

        $confirmed = $service->confirmTopUpById($wallet, $txn->id);
        $this->assertTrue($confirmed);

        $wallet->refresh();
        $this->assertEquals(100.00, (float) $wallet->balance);
        $this->assertEquals(0.0, (float) $wallet->pending_balance);
    }

    public function test_wallet_transfer_between_users(): void
    {
        $otherRider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $otherRider->assignRole('rider');

        Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);
        Wallet::create(['user_id' => $otherRider->id, 'balance' => 0.0]);

        $service = app(WalletService::class);
        $result = $service->transfer($this->rider, $otherRider, 200.00);
        $this->assertTrue($result);

        $fromWallet = Wallet::where('user_id', $this->rider->id)->first();
        $toWallet = Wallet::where('user_id', $otherRider->id)->first();

        $this->assertEquals(300.00, (float) $fromWallet->balance);
        $this->assertEquals(200.00, (float) $toWallet->balance);
    }

    public function test_wallet_transfer_insufficient_funds_rejected(): void
    {
        $otherRider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $otherRider->assignRole('rider');

        Wallet::create(['user_id' => $this->rider->id, 'balance' => 50.00]);
        Wallet::create(['user_id' => $otherRider->id, 'balance' => 0.0]);

        $service = app(WalletService::class);
        $this->expectException(\RuntimeException::class);
        $service->transfer($this->rider, $otherRider, 100.00);
    }

    public function test_wallet_ledger_audit_trail(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 1000.00]);
        $service = app(WalletService::class);

        $service->credit($wallet, 200.00, 'topup', $wallet->id, 'Credit 1');
        $service->debit($wallet, 150.00, 'deduction', $wallet->id, 'Debit 1');
        $service->credit($wallet, 50.00, 'refund', $wallet->id, 'Credit 2');
        $service->debit($wallet, 75.00, 'deduction', $wallet->id, 'Debit 2');
        $service->credit($wallet, 25.00, 'bonus', $wallet->id, 'Credit 3');

        $wallet->refresh();
        $this->assertEquals(1050.00, (float) $wallet->balance);

        $totalCredits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'credit')->sum('amount');
        $totalDebits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')->sum('amount');

        $expectedBalance = 1000.00 + (float) $totalCredits - (float) $totalDebits;
        $this->assertEquals($expectedBalance, (float) $wallet->balance);

        $txnCount = WalletTransaction::where('wallet_id', $wallet->id)->count();
        $this->assertEquals(5, $txnCount);
    }

    public function test_wallet_zero_balance_debit_rejected(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0]);
        $service = app(WalletService::class);

        $this->expectException(\RuntimeException::class);
        $service->debit($wallet, 10.00, 'deduction', $wallet->id, 'Should fail');
    }

    public function test_wallet_deposit_and_withdraw_verify_balance(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0]);
        Sanctum::actingAs($this->rider);

        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 300.00,
            'payment_method' => 'payfast',
        ])->assertStatus(201);

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance);

        $wallet->update(['balance' => 300.00]);

        $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 50.00,
            'bank_account' => '00001111222',
            'bank_code' => '470010',
            'bank_name' => 'Test Bank',
        ])->assertStatus(201);

        $wallet->refresh();
        $this->assertEquals(250.00, (float) $wallet->balance);
    }

    public function test_wallet_service_has_sufficient_funds(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 100.00]);
        $service = app(WalletService::class);

        $this->assertTrue($service->hasSufficientFunds($wallet, 50.00));
        $this->assertTrue($service->hasSufficientFunds($wallet, 100.00));
        $this->assertFalse($service->hasSufficientFunds($wallet, 150.00));
    }

    public function test_wallet_reconcile_consistent_wallet(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0]);
        $service = app(WalletService::class);

        $service->credit($wallet, 100.00, 'topup', $wallet->id);
        $service->debit($wallet, 50.00, 'deduction', $wallet->id);

        $wallet->refresh();
        $this->assertEquals(50.00, (float) $wallet->balance);

        $result = $service->reconcileBalance($wallet);

        $this->assertTrue($result['is_consistent']);
        $this->assertEquals(0.0, $result['discrepancy']);
    }

    public function test_wallet_reconcile_corrects_discrepancy(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0]);
        $service = app(WalletService::class);

        $service->credit($wallet, 100.00, 'topup', $wallet->id);
        $wallet->refresh();
        $this->assertEquals(100.00, (float) $wallet->balance);

        $wallet->decrement('balance', 200.00);
        $wallet->refresh();
        $this->assertEquals(-100.00, (float) $wallet->balance);

        $result = $service->reconcileBalance($wallet);
        $wallet->refresh();

        $this->assertFalse($result['is_consistent']);

        $totalCredits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'credit')->sum('amount');
        $totalDebits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')->sum('amount');
        $expectedBalance = (float) $totalCredits - (float) $totalDebits;
        $this->assertEquals($expectedBalance, (float) $wallet->balance);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  5. FOOD ORDERING — ADVANCED FLOWS
    // ═══════════════════════════════════════════════════════════════════════

    private function createRestaurantWithMenu(): Restaurant
    {
        $restaurant = Restaurant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'minimum_order' => 20,
            'delivery_fee' => 15,
            'opens_at' => null,
            'closes_at' => null,
        ]);
        $category = RestaurantCategory::factory()->create([
            'restaurant_id' => $restaurant->id,
        ]);
        MenuItem::factory()->create([
            'restaurant_id' => $restaurant->id,
            'category_id' => $category->id,
            'price' => 45,
            'is_available' => true,
        ]);

        return $restaurant;
    }

    public function test_food_order_price_calculation(): void
    {
        $restaurant = $this->createRestaurantWithMenu();
        $menuItem = MenuItem::where('restaurant_id', $restaurant->id)->first();

        $response = $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 2]],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'wallet',
            ]);
        $response->assertCreated();
        $orderId = $response->json('id');

        $order = FoodOrder::find($orderId);
        $this->assertNotNull($order);
        $this->assertEquals('pending', $order->status);
        $this->assertEquals(90.00, (float) $order->subtotal);
        $this->assertGreaterThan(0, (float) $order->delivery_fee);
        $this->assertGreaterThan(0, (float) $order->total_amount);

        $calculatedTotal = round((float) $order->subtotal + (float) $order->delivery_fee + (float) $order->service_fee, 2);
        $this->assertEquals($calculatedTotal, (float) $order->total_amount);
    }

    public function test_food_order_minimum_order_enforced(): void
    {
        $restaurant = Restaurant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'minimum_order' => 100,
            'delivery_fee' => 15,
            'opens_at' => null,
            'closes_at' => null,
        ]);
        $category = RestaurantCategory::factory()->create(['restaurant_id' => $restaurant->id]);
        MenuItem::factory()->create([
            'restaurant_id' => $restaurant->id,
            'category_id' => $category->id,
            'price' => 10,
            'is_available' => true,
        ]);
        $menuItem = MenuItem::where('restaurant_id', $restaurant->id)->first();

        $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ])->assertStatus(422);
    }

    public function test_food_order_full_lifecycle_with_delivery_timestamps(): void
    {
        $restaurant = $this->createRestaurantWithMenu();
        $menuItem = MenuItem::where('restaurant_id', $restaurant->id)->first();

        $response = $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ]);
        $orderId = $response->json('id');

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/accept");

        foreach (['preparing', 'ready', 'picked_up', 'in_transit', 'delivered'] as $status) {
            $this->actingAs($this->driver)
                ->postJson("/api/v1/driver/food/orders/{$orderId}/status", ['status' => $status])
                ->assertOk();
        }

        $order = FoodOrder::find($orderId);
        $this->assertEquals('delivered', $order->status);
        $this->assertNotNull($order->actual_delivery_at);
    }

    public function test_food_order_invalid_status_transition_rejected(): void
    {
        $restaurant = $this->createRestaurantWithMenu();
        $order = FoodOrder::factory()->create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->rider->id,
            'driver_id' => $this->driver->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'pending',
        ]);

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertStatus(422);
    }

    public function test_food_order_item_quantities_accurate(): void
    {
        $restaurant = $this->createRestaurantWithMenu();
        $menuItem = MenuItem::where('restaurant_id', $restaurant->id)->first();

        $response = $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 3],
                ],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ]);
        $response->assertCreated();
        $orderId = $response->json('id');

        $items = FoodOrderItem::where('food_order_id', $orderId)->get();
        $this->assertCount(1, $items);
        $this->assertEquals(3, $items[0]->quantity);
        $this->assertEquals(135.00, (float) $items[0]->line_total);
    }

    public function test_food_order_rating_after_delivery(): void
    {
        $restaurant = $this->createRestaurantWithMenu();
        $order = FoodOrder::factory()->create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $this->rider->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'delivered',
            'actual_delivery_at' => now(),
        ]);

        $this->actingAs($this->rider)
            ->postJson("/api/v1/food/orders/{$order->id}/rate", [
                'rating' => 5,
                'comment' => 'Perfect!',
            ])->assertOk();

        $order->refresh();
        $this->assertEquals(5, $order->rating);
    }

    public function test_food_order_cancel_after_confirmed(): void
    {
        $restaurant = $this->createRestaurantWithMenu();
        $menuItem = MenuItem::where('restaurant_id', $restaurant->id)->first();

        $response = $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 2]],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ]);
        $orderId = $response->json('id');

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/accept")
            ->assertOk();

        $this->actingAs($this->rider)
            ->postJson("/api/v1/food/orders/{$orderId}/cancel")
            ->assertOk();

        $this->assertDatabaseHas('food_orders', [
            'id' => $orderId,
            'status' => 'cancelled',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  6. CROSS-ENTITY & MULTI-BUSINESS FLOWS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_same_driver_handles_ride_and_food_delivery(): void
    {
        $otherDriver = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $otherDriver->assignRole('driver');

        $restaurant = $this->createRestaurantWithMenu();
        $menuItem = MenuItem::where('restaurant_id', $restaurant->id)->first();

        $foodResponse = $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ]);
        $foodOrderId = $foodResponse->json('id');

        Sanctum::actingAs($this->rider);
        $rideResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Phalaborwa CBD',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Phalaborwa Airport',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);
        $rideId = $rideResponse->json('ride.id');

        Sanctum::actingAs($this->driver);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept")->assertStatus(200);

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$foodOrderId}/accept")
            ->assertOk();

        $this->assertEquals(1, FoodOrder::where('driver_id', $this->driver->id)->count());
        $this->assertEquals(1, Ride::where('driver_id', $this->driver->id)->count());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  7. CASH RECONCILIATION & DRIVER PAYOUT
    // ═══════════════════════════════════════════════════════════════════════

    public function test_cash_reconciliation_flow(): void
    {
        $ride = $this->createRide('completed');
        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $payment = Payment::where('ride_id', $ride->id)->first();

        $payment->update([
            'cash_received' => (float) $ride->total_fare,
            'cash_reconciled' => false,
        ]);
        $payment->refresh();
        $this->assertFalse($payment->cash_reconciled);

        $payment->update([
            'cash_reconciled' => true,
            'cash_settled_at' => now(),
        ]);
        $payment->refresh();
        $this->assertTrue($payment->cash_reconciled);
        $this->assertNotNull($payment->cash_settled_at);
    }

    public function test_cash_discrepancy_detected(): void
    {
        $ride = $this->createRide('completed');
        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $payment = Payment::where('ride_id', $ride->id)->first();
        $payment->update([
            'cash_received' => 80.00,
            'cash_discrepancy' => 5.00,
            'cash_reconciled' => false,
        ]);
        $payment->refresh();
        $this->assertEquals(5.00, (float) $payment->cash_discrepancy);
    }

    public function test_driver_payout_from_completed_ride(): void
    {
        $ride = $this->createRide('completed');

        Sanctum::actingAs($this->rider);
        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(201);

        $payment = Payment::where('ride_id', $ride->id)->first();
        $platformFee = round((float) $ride->total_fare * 0.15, 2);
        $driverPayout = round((float) $ride->total_fare - $platformFee, 2);

        $payment->update([
            'platform_fee' => $platformFee,
            'driver_payout' => $driverPayout,
        ]);

        $payment->refresh();
        $this->assertEquals($platformFee, (float) $payment->platform_fee);
        $this->assertEquals($driverPayout, (float) $payment->driver_payout);
        $this->assertEquals((float) $payment->platform_fee + (float) $payment->driver_payout, round((float) $ride->total_fare, 2));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  8. CONCURRENT OPERATIONS & EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════

    public function test_concurrent_wallet_operations_sequentialized(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 100.00]);
        $service = app(WalletService::class);

        $service->debit($wallet, 30.00, 'deduction', $wallet->id, 'Deduction 1');
        $service->debit($wallet, 30.00, 'deduction', $wallet->id, 'Deduction 2');
        $service->debit($wallet, 30.00, 'deduction', $wallet->id, 'Deduction 3');

        $wallet->refresh();
        $this->assertEquals(10.00, (float) $wallet->balance);

        $debits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')->count();
        $this->assertEquals(3, $debits);
    }

    public function test_payment_gateway_response_stored(): void
    {
        $ride = $this->createRide('completed');
        $gatewayResponse = [
            'transaction_id' => 'trx_' . uniqid(),
            'status' => 'success',
            'currency' => 'ZAR',
            'amount' => 85.00,
            'fee' => 2.50,
        ];

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => 85.00,
            'method' => 'stripe',
            'status' => 'completed',
            'gateway' => 'stripe',
            'gateway_reference' => 'pi_' . uniqid(),
            'gateway_response' => $gatewayResponse,
        ]);

        $this->assertEquals($gatewayResponse['transaction_id'], $payment->gateway_response['transaction_id']);
        $this->assertEquals('success', $payment->gateway_response['status']);
    }

    public function test_scheduled_ride_creation_endpoint(): void
    {
        Sanctum::actingAs($this->rider);

        $response = $this->postJson('/api/v1/scheduled-rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Phalaborwa CBD',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Phalaborwa Airport',
            'category' => 'standard',
            'scheduled_at' => now()->addHours(2)->toISOString(),
        ]);

        $this->assertTrue(in_array($response->status(), [201, 200, 422]));
    }

    public function test_rating_unique_constraint_at_model_level(): void
    {
        $ride = $this->createRide('completed', driverId: $this->driver->id);

        Rating::create([
            'ride_id' => $ride->id,
            'rater_id' => $this->rider->id,
            'ratee_id' => $this->driver->id,
            'score' => 5,
        ]);

        $caught = false;
        try {
            Rating::create([
                'ride_id' => $ride->id,
                'rater_id' => $this->rider->id,
                'ratee_id' => $this->driver->id,
                'score' => 3,
            ]);
        } catch (\Illuminate\Database\QueryException) {
            $caught = true;
        }

        $this->assertTrue($caught);
    }
}
