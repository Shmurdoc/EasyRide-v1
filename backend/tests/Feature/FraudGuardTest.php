<?php

namespace Tests\Feature;

use App\Models\DriverViolation;
use App\Models\FoodOrder;
use App\Models\Restaurant;
use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use App\Services\DriverFraudGuardService;
use App\Services\FoodOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FraudGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function makePaidDriver(float $balance = 100.0): User
    {
        $driver = User::factory()->create([
            'role' => 'driver',
            'is_online' => true,
            'is_active' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        Wallet::create([
            'user_id' => $driver->id,
            'balance' => $balance,
            'pending_balance' => 0,
            'currency' => 'ZAR',
        ]);

        return $driver;
    }

    public function test_r1_fine_applied_when_driver_cancels_after_pickup(): void
    {
        $tenant = Tenant::factory()->create();
        $driver = $this->makePaidDriver();
        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'in_progress',
            'picked_up_at' => now()->subMinutes(10),
        ]);

        $violation = app(DriverFraudGuardService::class)->evaluateCancellation($ride, $driver, 'rider asked to stop');

        $this->assertNotNull($violation);
        $this->assertSame(DriverViolation::TYPE_CANCEL_AFTER_PICKUP, $violation->violation_type);
        $this->assertSame(DriverViolation::STATUS_PAID, $violation->status);
        $this->assertEquals(50.0, (float) $violation->fine_amount);

        $this->assertDatabaseHas('driver_violations', [
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'violation_type' => DriverViolation::TYPE_CANCEL_AFTER_PICKUP,
        ]);

        $wallet = Wallet::where('user_id', $driver->id)->first();
        $this->assertEquals(50.0, (float) $wallet->balance);
    }

    public function test_r1_fine_stays_pending_when_driver_wallet_is_empty(): void
    {
        $tenant = Tenant::factory()->create();
        $driver = $this->makePaidDriver(0.0);
        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'in_progress',
            'picked_up_at' => now()->subMinutes(10),
        ]);

        $violation = app(DriverFraudGuardService::class)->evaluateCancellation($ride, $driver, 'emergency');

        $this->assertNotNull($violation);
        $this->assertSame(DriverViolation::STATUS_PENDING, $violation->status);

        \App\Models\SystemSetting::updateOrCreate(
            ['tenant_id' => $driver->tenant_id, 'key' => 'fraud_unpaid_fines_block_rides'],
            ['value' => 'true', 'options' => null],
        );

        $g = app(DriverFraudGuardService::class);
        $this->assertTrue($g->isBlockedFromAccepting($driver));
    }

    public function test_r2_fine_when_cancel_near_dropoff(): void
    {
        $tenant = Tenant::factory()->create();
        $driver = $this->makePaidDriver();
        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'accepted',
            'dropoff_latitude' => -23.9469,
            'dropoff_longitude' => 29.4727,
            'picked_up_at' => null,
        ]);

        $driver->update([
            'current_latitude' => -23.9469,
            'current_longitude' => 29.4727,
        ]);

        $violation = app(DriverFraudGuardService::class)->evaluateCancellation($ride->fresh(), $driver->fresh(), 'short distance');

        $this->assertNotNull($violation);
        $this->assertSame(DriverViolation::TYPE_CANCEL_NEAR_DROPOFF, $violation->violation_type);
        $this->assertEquals(50.0, (float) $violation->fine_amount);
        $this->assertNotNull($violation->distance_to_dropoff_km);
    }

    public function test_no_fine_for_far_pre_pickup_cancel(): void
    {
        $tenant = Tenant::factory()->create();
        $driver = $this->makePaidDriver();
        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'accepted',
            'dropoff_latitude' => -23.9468,
            'dropoff_longitude' => 29.4726,
        ]);

        $driver->update([
            'current_latitude' => -23.9000,
            'current_longitude' => 29.4200,
        ]);

        $violation = app(DriverFraudGuardService::class)->evaluateCancellation($ride->fresh(), $driver->fresh(), 'traffic');

        $this->assertNull($violation);
        $this->assertSame(0, DriverViolation::count());
    }

    public function test_collusion_flagged_after_threshold_without_fine(): void
    {
        $tenant = Tenant::factory()->create();
        $driver = $this->makePaidDriver(0.0);
        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $service = app(DriverFraudGuardService::class);

        for ($i = 0; $i < 3; $i++) {
            Ride::factory()->create([
                'tenant_id' => $tenant->id,
                'rider_id' => $rider->id,
                'driver_id' => $driver->id,
                'status' => 'cancelled',
                'picked_up_at' => now()->subMinutes(30 + $i),
                'cancelled_at' => now()->subMinutes(30 + $i),
            ]);
        }

        $violation = $service->detectCollusion($rider, $driver);

        $this->assertNotNull($violation);
        $this->assertSame(DriverViolation::TYPE_COLLUSION_FLAG, $violation->violation_type);
        $this->assertSame(DriverViolation::STATUS_PENDING, $violation->status);
        $this->assertEquals(0.0, (float) $violation->fine_amount);
    }

    public function test_food_driver_cancel_after_pickup_fined(): void
    {
        $tenant = Tenant::factory()->create();
        $driver = $this->makePaidDriver();
        $customer = User::factory()->create(['tenant_id' => $tenant->id]);
        $customer->assignRole('rider');

        $order = FoodOrder::create([
            'tenant_id' => $tenant->id,
            'restaurant_id' => Restaurant::factory()->create(['tenant_id' => $tenant->id])->id,
            'customer_id' => $customer->id,
            'driver_id' => $driver->id,
            'status' => 'in_transit',
            'delivery_latitude' => -23.9468,
            'delivery_longitude' => 29.4726,
            'delivery_address' => 'Phalaborwa',
            'subtotal' => 90.00,
            'total_amount' => 90.00,
        ]);

        $service = app(FoodOrderService::class);
        $cancelled = $service->driverCancelOrder($order, $driver, 'food was damaged');

        $this->assertSame('cancelled', $cancelled->status);
        $this->assertNotNull($service->lastViolation());
        $this->assertSame(DriverViolation::TYPE_FOOD_CANCEL_AFTER_PICKUP, $service->lastViolation()->violation_type);

        $this->assertDatabaseHas('driver_violations', [
            'food_order_id' => $order->id,
            'driver_id' => $driver->id,
            'violation_type' => DriverViolation::TYPE_FOOD_CANCEL_AFTER_PICKUP,
        ]);
    }

    public function test_fine_can_be_paid_from_wallet(): void
    {
        $driver = $this->makePaidDriver(100.0);
        $tenant = Tenant::factory()->create();
        $rider = User::factory()->create(['tenant_id' => $tenant->id]);
        $rider->assignRole('rider');

        $ride = Ride::factory()->create([
            'tenant_id' => $tenant->id,
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'in_progress',
            'picked_up_at' => now(),
        ]);

        $service = app(DriverFraudGuardService::class);
        $violation = $service->evaluateCancellation($ride, $driver, 'no show');

        $this->assertSame(DriverViolation::STATUS_PAID, $violation->status);

        $unpaid = $service->unpaidFinesTotal($driver);
        $this->assertEquals(0.0, $unpaid);
    }
}