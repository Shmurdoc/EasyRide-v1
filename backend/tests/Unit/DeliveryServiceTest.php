<?php

namespace Tests\Unit;

use App\Models\Delivery;
use App\Models\Tenant;
use App\Services\DeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_delivery_record(): void
    {
        $service = app(DeliveryService::class);
        $delivery = $service->createDelivery([
            'tenant_id' => Tenant::factory()->create()->id,
            'pickup_address' => '123 Main St',
            'dropoff_address' => '456 Oak Ave',
            'status' => 'pending',
        ]);

        $this->assertNotNull($delivery);
        $this->assertEquals('pending', $delivery->status);
        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id]);
    }

    public function test_update_status_sets_timestamps(): void
    {
        $delivery = Delivery::factory()->create(['status' => 'picked_up']);
        $service = app(DeliveryService::class);

        $service->updateStatus($delivery->fresh(), 'in_transit');
        $service->updateStatus($delivery->fresh(), 'at_dropoff');
        $updated = $service->updateStatus(
            $delivery->fresh(),
            'delivered',
            podPhotoUrl: 'https://cdn.example.com/pod/1.jpg',
        );

        $this->assertEquals('delivered', $updated->status);
        $this->assertNotNull($updated->delivered_at);
    }
}
