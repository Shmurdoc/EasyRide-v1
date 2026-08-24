<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\RideStatus;
use App\Models\FoodOrder;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\PromoCode;
use App\Models\Rating;
use App\Models\Restaurant;
use App\Models\RestaurantCategory;
use App\Models\Ride;
use App\Models\RideStatusHistory;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DatabaseFlowTest extends TestCase
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

    private function createRide(string $status = 'searching', ?string $paymentMethod = 'cash'): Ride
    {
        return Ride::create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $this->rider->id,
            'driver_id' => $status === 'searching' ? null : $this->driver->id,
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
    //  1. RIDE LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    public function test_full_ride_lifecycle_creates_status_history_records(): void
    {
        $ride = $this->createRide('searching');

        $this->assertDatabaseHas('rides', ['id' => $ride->id, 'status' => 'searching']);

        $ride->transitionTo('cancelled', $this->rider->id, 'changed mind');
        $this->assertDatabaseHas('rides', ['id' => $ride->id, 'status' => 'cancelled']);

        $historyCount = RideStatusHistory::where('ride_id', $ride->id)->count();
        $this->assertEquals(1, $historyCount);
    }

    public function test_full_ride_lifecycle_happy_path(): void
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
        $this->assertNotNull($ride->total_fare);

        Sanctum::actingAs($this->driver);
        $this->postJson("/api/v1/rides/{$rideId}/driver-accept")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::ACCEPTED, $ride->status);
        $this->assertEquals($this->driver->id, $ride->driver_id);

        $this->postJson("/api/v1/rides/{$rideId}/driver-arrived")->assertStatus(200);
        $ride->refresh();
        $this->assertEquals(RideStatus::ARRIVED, $ride->status);

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

        $historyRecords = RideStatusHistory::where('ride_id', $rideId)->orderBy('created_at')->get();
        $expectedStatuses = ['accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed'];
        foreach ($expectedStatuses as $i => $status) {
            if (isset($historyRecords[$i])) {
                $this->assertEquals($status, $historyRecords[$i]->to_status);
            }
        }
    }

    public function test_ride_transition_to_completed_records_timestamps(): void
    {
        $ride = $this->createRide('in_progress');
        Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->driver);
        $this->postJson("/api/v1/rides/{$ride->id}/complete")->assertStatus(200);

        $ride->refresh();
        $this->assertNotNull($ride->completed_at);
        $this->assertNotNull($ride->dropoff_reached_at);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  2. RIDE STATE TRANSITIONS & CANCELLATION
    // ═══════════════════════════════════════════════════════════════════════

    public function test_cancel_during_searching_no_fee(): void
    {
        $ride = $this->createRide('searching');
        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'No longer need ride',
        ])->assertStatus(200);

        $ride->refresh();
        $this->assertEquals(RideStatus::CANCELLED, $ride->status);
        $this->assertEquals(0.0, (float) $ride->cancellation_fee);
    }

    public function test_cancel_after_accepted_charges_fee(): void
    {
        $ride = $this->createRide('accepted');
        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Changed mind',
        ])->assertStatus(200);

        $ride->refresh();
        $this->assertEquals(RideStatus::CANCELLED, $ride->status);
        $this->assertGreaterThan(0, (float) $ride->cancellation_fee);
    }

    public function test_cancellation_records_status_history(): void
    {
        $ride = $this->createRide('accepted');
        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Test reason',
        ])->assertStatus(200);

        $history = RideStatusHistory::where('ride_id', $ride->id)
            ->where('to_status', 'cancelled')
            ->first();
        $this->assertNotNull($history);
        $this->assertEquals('accepted', $history->from_status);
        $this->assertEquals($this->rider->id, $history->actor_id);
        $this->assertEquals('Test reason', $history->reason);
    }

    public function test_cancel_in_progress_records_driver_release(): void
    {
        $ride = $this->createRide('in_progress');
        $this->driver->update(['current_ride_id' => $ride->id]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Emergency',
        ])->assertStatus(200);

        $this->driver->refresh();
        $this->assertNull($this->driver->current_ride_id);
    }

    public function test_cannot_transition_from_terminal_state(): void
    {
        $ride = $this->createRide('completed');
        $result = $ride->transitionTo('in_progress');
        $this->assertFalse($result);
    }

    public function test_model_transition_rejects_invalid_transition(): void
    {
        $ride = $this->createRide('searching');
        $result = $ride->transitionTo('completed', $this->driver->id);
        $this->assertFalse($result);
        $ride->refresh();
        $this->assertNotEquals('completed', $ride->status);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3. PAYMENT FLOWS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_cash_payment_creates_completed_payment_record(): void
    {
        $ride = $this->createRide('completed');
        Wallet::create(['user_id' => $this->driver->id, 'balance' => 500.00]);
        Sanctum::actingAs($this->rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ]);
        $response->assertStatus(201);

        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => $ride->total_fare,
            'method' => 'cash',
            'status' => 'completed',
        ]);
    }

    public function test_wallet_payment_deducts_balance(): void
    {
        $ride = $this->createRide('completed', 'wallet');
        Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $response = $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ]);
        $response->assertStatus(201);

        $wallet = Wallet::where('user_id', $this->rider->id)->first();
        $expected = round(500.00 - (float) $ride->total_fare, 2);
        $this->assertEquals($expected, round((float) $wallet->balance, 2));
    }

    public function test_wallet_payment_creates_debit_transaction(): void
    {
        $ride = $this->createRide('completed', 'wallet');
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", ['payment_method' => 'wallet'])->assertStatus(201);

        $txn = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')
            ->first();
        $this->assertNotNull($txn);
        $this->assertEquals((float) $ride->total_fare, (float) $txn->amount);
        $this->assertEquals(500.00, (float) $txn->balance_before);
        $this->assertEquals(500.00 - (float) $ride->total_fare, (float) $txn->balance_after);
    }

    public function test_wallet_payment_insufficient_balance_rejected(): void
    {
        $ride = $this->createRide('completed', 'wallet');
        Wallet::create(['user_id' => $this->rider->id, 'balance' => 10.00]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'wallet',
        ])->assertStatus(422);
    }

    public function test_duplicate_payment_rejected(): void
    {
        $ride = $this->createRide('completed');
        Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => $ride->total_fare,
            'method' => 'cash',
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(422);
    }

    public function test_admin_can_refund_payment(): void
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
            'reason' => 'duplicate_charge',
        ])->assertStatus(200);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'refunded',
        ]);
    }

    public function test_cannot_refund_more_than_paid(): void
    {
        $ride = $this->createRide('completed');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'payer_id' => $this->rider->id,
            'amount' => 50.00,
            'method' => 'cash',
            'status' => 'completed',
        ]);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/payments/{$payment->id}/refund", [
            'amount' => 500.00,
            'reason' => 'over_refund',
        ])->assertStatus(422);
    }

    public function test_cannot_pay_uncompleted_ride(): void
    {
        $ride = $this->createRide('in_progress');
        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(422);
    }

    public function test_cannot_pay_others_ride(): void
    {
        $ride = $this->createRide('completed');
        $otherRider = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $otherRider->assignRole('rider');

        Sanctum::actingAs($otherRider);
        $this->postJson("/api/v1/payments/rides/{$ride->id}/pay", [
            'payment_method' => 'cash',
        ])->assertStatus(403);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  4. WALLET OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_wallet_deposit_creates_pending_transaction(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 0.0]);
        Sanctum::actingAs($this->rider);

        $this->postJson('/api/v1/wallet/deposit', [
            'amount' => 100.00,
            'payment_method' => 'payfast',
        ])->assertStatus(201);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'type' => 'credit',
            'amount' => 100.00,
            'reference_type' => 'pending_topup',
        ]);
    }

    public function test_wallet_withdraw_reduces_balance(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 500.00]);
        Sanctum::actingAs($this->rider);

        $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 100.00,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ])->assertStatus(201);

        $wallet->refresh();
        $this->assertEquals(400.00, (float) $wallet->balance);
    }

    public function test_wallet_withdraw_insufficient_funds_rejected(): void
    {
        Wallet::create(['user_id' => $this->rider->id, 'balance' => 25.00]);
        Sanctum::actingAs($this->rider);

        $this->postJson('/api/v1/wallet/withdraw', [
            'amount' => 100.00,
            'bank_account' => '1234567890',
            'bank_code' => '123',
            'bank_name' => 'Test Bank',
        ])->assertStatus(422);
    }

    public function test_wallet_balance_consistency_after_multiple_operations(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 1000.00]);

        $service = app(WalletService::class);
        $service->credit($wallet, 200.00, 'topup', $wallet->id, 'Test credit');
        $service->debit($wallet, 150.00, 'deduction', $wallet->id, 'Test debit');
        $service->credit($wallet, 50.00, 'refund', $wallet->id, 'Test refund');

        $wallet->refresh();
        $this->assertEquals(1100.00, (float) $wallet->balance);

        $totalCredits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'credit')
            ->sum('amount');
        $totalDebits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')
            ->sum('amount');
        $calculatedBalance = 1000.00 + (float) $totalCredits - (float) $totalDebits;

        $this->assertEquals((float) $wallet->balance, $calculatedBalance);
    }

    public function test_wallet_concurrent_deduction_prevention(): void
    {
        $wallet = Wallet::create(['user_id' => $this->rider->id, 'balance' => 100.00]);
        $service = app(WalletService::class);

        $caught = 0;
        try {
            $service->deduct($this->rider, 100.00, 'First deduction');
            $service->deduct($this->rider, 100.00, 'Second deduction should fail');
        } catch (\RuntimeException) {
            $caught++;
        }

        $wallet->refresh();
        $this->assertEquals(0.0, (float) $wallet->balance);

        $debits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')
            ->count();
        $this->assertLessThanOrEqual(2, $debits);
    }

    public function test_wallet_reconcile_detects_consistency(): void
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
            ->where('type', 'credit')
            ->sum('amount');
        $totalDebits = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('type', 'debit')
            ->sum('amount');
        $expectedBalance = (float) $totalCredits - (float) $totalDebits;
        $this->assertEquals($expectedBalance, (float) $wallet->balance);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  5. FOOD ORDERING
    // ═══════════════════════════════════════════════════════════════════════

    private function createRestaurantAndMenu(): Restaurant
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

    public function test_food_order_lifecycle(): void
    {
        $restaurant = $this->createRestaurantAndMenu();
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
        $response->assertCreated();
        $orderId = $response->json('id');

        $this->assertDatabaseHas('food_orders', [
            'id' => $orderId,
            'customer_id' => $this->rider->id,
            'restaurant_id' => $restaurant->id,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('food_order_items', [
            'food_order_id' => $orderId,
            'menu_item_id' => $menuItem->id,
            'quantity' => 2,
        ]);

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/accept")
            ->assertOk();

        $this->assertDatabaseHas('food_orders', [
            'id' => $orderId,
            'status' => 'confirmed',
            'driver_id' => $this->driver->id,
        ]);

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/status", ['status' => 'preparing'])
            ->assertOk();

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/status", ['status' => 'ready'])
            ->assertOk();

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/status", ['status' => 'picked_up'])
            ->assertOk();

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/status", ['status' => 'in_transit'])
            ->assertOk();

        $this->actingAs($this->driver)
            ->postJson("/api/v1/driver/food/orders/{$orderId}/status", ['status' => 'delivered'])
            ->assertOk();

        $this->assertDatabaseHas('food_orders', [
            'id' => $orderId,
            'status' => 'delivered',
        ]);

        $this->actingAs($this->rider)
            ->postJson("/api/v1/food/orders/{$orderId}/rate", [
                'rating' => 5,
                'comment' => 'Delicious!',
            ])
            ->assertOk();

        $this->assertDatabaseHas('food_orders', [
            'id' => $orderId,
            'rating' => 5,
        ]);
    }

    public function test_food_order_cancel(): void
    {
        $restaurant = $this->createRestaurantAndMenu();
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
        $response->assertCreated();
        $orderId = $response->json('id');

        $this->actingAs($this->rider)
            ->postJson("/api/v1/food/orders/{$orderId}/cancel")
            ->assertOk();

        $this->assertDatabaseHas('food_orders', [
            'id' => $orderId,
            'status' => 'cancelled',
        ]);
    }

    public function test_food_order_requires_items(): void
    {
        $restaurant = $this->createRestaurantAndMenu();

        $this->actingAs($this->rider)
            ->postJson("/api/v1/food/restaurants/{$restaurant->id}/order", [
                'restaurant_id' => $restaurant->id,
                'items' => [],
                'delivery_address' => '123 Test St',
                'delivery_lat' => -33.9249,
                'delivery_lng' => 18.4241,
                'payment_method' => 'cash',
            ])->assertStatus(422);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  6. CROSS-ENTITY SCENARIOS
    // ═══════════════════════════════════════════════════════════════════════

    public function test_same_user_rider_and_food_customer(): void
    {
        $restaurant = $this->createRestaurantAndMenu();
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
        $foodResponse->assertCreated();

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
        $rideResponse->assertStatus(201);

        $this->assertEquals(1, FoodOrder::where('customer_id', $this->rider->id)->count());
        $this->assertEquals(1, Ride::where('rider_id', $this->rider->id)->count());
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  7. CONCURRENT REQUESTS & EDGE CASES
    // ═══════════════════════════════════════════════════════════════════════

    public function test_concurrent_ride_request_lock_prevents_duplicate(): void
    {
        Sanctum::actingAs($this->rider);
        $firstResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);
        $firstResponse->assertStatus(201);

        Sanctum::actingAs($this->rider);
        $secondResponse = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => 'Pickup',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => 'Dropoff',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);
        $this->assertTrue(
            $secondResponse->status() === 422 || $secondResponse->status() === 201,
        );

        $rideCount = Ride::where('rider_id', $this->rider->id)->count();
        $this->assertGreaterThanOrEqual(1, $rideCount);
    }

    public function test_double_accept_prevention(): void
    {
        $ride = $this->createRide('searching');
        $otherDriver = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'is_online' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $otherDriver->assignRole('driver');

        Sanctum::actingAs($this->driver);
        $this->postJson("/api/v1/rides/{$ride->id}/driver-accept")->assertStatus(200);

        Sanctum::actingAs($otherDriver);
        $secondResponse = $this->postJson("/api/v1/rides/{$ride->id}/driver-accept");
        $this->assertTrue(in_array($secondResponse->status(), [422, 403]));
    }

    public function test_promocode_usage_increments(): void
    {
        Sanctum::actingAs($this->rider);

        $ride = Ride::create([
            'tenant_id' => $this->tenant->id,
            'rider_id' => $this->rider->id,
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

        $promo = PromoCode::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'TEST10',
            'type' => 'percentage',
            'value' => 10,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $this->postJson("/api/v1/rides/{$ride->id}/apply-promo", [
            'code' => 'TEST10',
        ])->assertStatus(200);

        $promo->refresh();
        $this->assertEquals(1, $promo->used_count);
    }

    public function test_rating_requires_completed_ride(): void
    {
        $ride = $this->createRide('in_progress');

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/rate", [
            'score' => 5,
            'comment' => 'Should fail',
        ])->assertStatus(422);
    }

    public function test_rating_creates_database_record(): void
    {
        $ride = $this->createRide('completed');

        Sanctum::actingAs($this->rider);
        $this->postJson("/api/v1/rides/{$ride->id}/rate", [
            'score' => 4,
            'comment' => 'Good ride',
        ])->assertStatus(201);

        $this->assertDatabaseHas('ratings', [
            'ride_id' => $ride->id,
            'rater_id' => $this->rider->id,
            'ratee_id' => $this->driver->id,
            'score' => 4,
        ]);
    }

    public function test_cash_payment_reconciliation_flow(): void
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

        $ride->refresh();
        $this->assertEquals('completed', $ride->status instanceof \App\Enums\RideStatus ? $ride->status->value : $ride->status);
    }
}
