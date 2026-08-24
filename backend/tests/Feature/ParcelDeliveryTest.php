<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\DriverViolation;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use App\Services\DeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ParcelDeliveryTest extends TestCase
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

        Wallet::create([
            'user_id' => $rider->id,
            'balance' => 500,
            'pending_balance' => 0,
            'currency' => 'ZAR',
        ]);

        return $rider;
    }

    private function makeDriver(): User
    {
        $driver = User::factory()->create([
            'role' => 'driver',
            'is_online' => true,
            'is_active' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ]);
        $driver->assignRole('driver');

        DriverProfile::create([
            'user_id' => $driver->id,
            'is_approved' => true,
            'is_verified' => true,
        ]);

        Wallet::create([
            'user_id' => $driver->id,
            'balance' => 100,
            'pending_balance' => 0,
            'currency' => 'ZAR',
        ]);

        return $driver;
    }

    private function createParcelData(array $overrides = []): array
    {
        return array_merge([
            'recipient_name' => 'Jane Smith',
            'recipient_phone' => '+27129876543',
            'pickup_address' => 'Phalaborwa Mall',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'Phalaborwa Hospital',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'item_description' => 'Document pack',
            'item_value' => 150.00,
            'weight_kg' => 2.5,
            'payment_method' => 'wallet',
        ], $overrides);
    }

    public function test_rider_can_quote_a_parcel(): void
    {
        $rider = $this->makeRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/deliveries/quote', $this->createParcelData());

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['quote' => ['total_fare', 'weight_tier', 'distance_km', 'weight_surcharge']],
            ]);

        $quote = $response->json('data.quote');
        $this->assertGreaterThan(0, $quote['total_fare']);
        $this->assertSame('medium', $quote['weight_tier']);
        $this->assertGreaterThan(0, $quote['weight_surcharge']);
    }

    public function test_rider_creates_parcel_with_computed_fare(): void
    {
        $rider = $this->makeRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/deliveries', $this->createParcelData());

        $response->assertStatus(201)
            ->assertJsonStructure(['delivery' => ['id', 'fare_amount', 'distance_km', 'weight_tier']]);

        $deliveryId = $response->json('delivery.id');

        $this->assertDatabaseHas('deliveries', [
            'id' => $deliveryId,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $this->assertGreaterThan(0, (float) Delivery::find($deliveryId)->fare_amount);
    }

    public function test_delivery_requires_pod_photo_to_complete(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver();

        $delivery = app(DeliveryService::class)->createDelivery([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'pending',
            'payment_method' => 'wallet',
            'payment_status' => 'paid',
            'item_description' => 'Package',
            'package_weight_kg' => 1.0,
            'recipient_name' => 'Jane Smith',
            'recipient_phone' => '+27129876543',
            'pickup_address' => 'A',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'B',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
        ]);

        $service = app(DeliveryService::class);
        $service->acceptDelivery($delivery, $driver);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Proof of delivery');

        $service->updateStatus($delivery->fresh(), 'delivered', (string) $driver->id);
    }

    public function test_full_flow_credits_driver_earnings_on_delivery(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver();

        $delivery = app(DeliveryService::class)->createDelivery([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'pending',
            'payment_method' => 'wallet',
            'payment_status' => 'paid',
            'item_description' => 'Package',
            'package_weight_kg' => 1.0,
            'recipient_name' => 'Jane Smith',
            'recipient_phone' => '+27129876543',
            'pickup_address' => 'A',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'B',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
        ]);

        $service = app(DeliveryService::class);
        $service->acceptDelivery($delivery, $driver);

        $this->assertSame($delivery->id, $driver->fresh()->current_ride_id);

        $service->updateStatus($delivery->fresh(), 'at_pickup', (string) $driver->id);
        $service->updateStatus($delivery->fresh(), 'picked_up', (string) $driver->id);
        $service->updateStatus($delivery->fresh(), 'in_transit', (string) $driver->id);
        $service->updateStatus($delivery->fresh(), 'at_dropoff', (string) $driver->id);
        $delivery = $service->updateStatus(
            $delivery->fresh(),
            'delivered',
            (string) $driver->id,
            podPhotoUrl: 'https://cdn.example.com/pod/1.jpg',
        );

        $this->assertSame('delivered', $delivery->status);
        $this->assertNotNull($delivery->pod_photo_url);
        $this->assertNotNull($delivery->delivered_at);

        $wallet = Wallet::where('user_id', $driver->id)->first();
        $this->assertEquals((float) $delivery->fare_amount, (float) $wallet->balance - 100);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $wallet->id,
            'reference_type' => 'parcel_delivery_earnings',
            'reference_id' => $delivery->id,
        ]);
    }

    public function test_driver_cancel_after_pickup_triggers_fine(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver();

        $delivery = app(DeliveryService::class)->createDelivery([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'pending',
            'payment_method' => 'wallet',
            'payment_status' => 'paid',
            'item_description' => 'Package',
            'package_weight_kg' => 1.0,
            'recipient_name' => 'Jane Smith',
            'recipient_phone' => '+27129876543',
            'pickup_address' => 'A',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'B',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
        ]);

        $service = app(DeliveryService::class);
        $service->acceptDelivery($delivery, $driver);
        $service->updateStatus($delivery->fresh(), 'at_pickup', (string) $driver->id);
        $service->updateStatus($delivery->fresh(), 'picked_up', (string) $driver->id);

        $service->driverCancelDelivery($delivery->fresh(), $driver, 'package damaged');

        $this->assertSame('cancelled', $delivery->fresh()->status);

        $this->assertDatabaseHas('driver_violations', [
            'delivery_id' => $delivery->id,
            'driver_id' => $driver->id,
            'violation_type' => DriverViolation::TYPE_PARCEL_CANCEL_AFTER_PICKUP,
        ]);
    }

    public function test_pre_pickup_cancel_refunds_paid_delivery(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver();

        $delivery = app(DeliveryService::class)->createDelivery([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'pending',
            'payment_method' => 'wallet',
            'payment_status' => 'paid',
            'item_description' => 'Package',
            'package_weight_kg' => 1.0,
            'recipient_name' => 'Jane Smith',
            'recipient_phone' => '+27129876543',
            'pickup_address' => 'A',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'B',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
        ]);

        $fare = (float) $delivery->fare_amount;
        $driverWallet = Wallet::where('user_id', $driver->id)->first();

        // fund driver with enough to avoid the R1 fine (cancelled pre-pickup → no fine path taken)
        $driverWallet->update(['balance' => 100]);

        app(DeliveryService::class)->driverCancelDelivery($delivery->fresh(), $driver, 'customer changed mind');

        $this->assertSame('cancelled', $delivery->fresh()->status);
        $this->assertSame('refunded', $delivery->fresh()->payment_status);

        $riderWallet = Wallet::where('user_id', $rider->id)->first();
        $this->assertEquals(500 + $fare, (float) $riderWallet->balance);
    }

    public function test_invalid_transition_rejected(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver();

        $delivery = app(DeliveryService::class)->createDelivery([
            'tenant_id' => $rider->tenant_id,
            'sender_id' => $rider->id,
            'status' => 'pending',
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'item_description' => 'Package',
            'package_weight_kg' => 1.0,
            'recipient_name' => 'Jane Smith',
            'recipient_phone' => '+27129876543',
            'pickup_address' => 'A',
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_address' => 'B',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Cannot transition');

        app(DeliveryService::class)->updateStatus($delivery, 'delivered', (string) $driver->id, podPhotoUrl: 'https://x/y.jpg');
    }

    public function test_driver_can_list_available_parcels_via_api(): void
    {
        $rider = $this->makeRider();
        $driver = $this->makeDriver();

        Sanctum::actingAs($rider);
        $this->postJson('/api/v1/deliveries', $this->createParcelData())->assertStatus(201);

        Sanctum::actingAs($driver);
        $response = $this->getJson('/api/v1/deliveries/available');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }
}