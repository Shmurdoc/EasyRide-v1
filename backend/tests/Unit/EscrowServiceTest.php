<?php

namespace Tests\Unit;

use App\Models\Payment;
use App\Models\Ride;
use App\Services\EscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EscrowServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_gateway_payment_marks_completed_and_is_idempotent(): void
    {
        $payment = Payment::factory()->create(['status' => Payment::STATUS_PENDING]);
        $service = app(EscrowService::class);

        $service->completeGatewayPayment($payment, 'ref-123');

        $payment->refresh();
        $this->assertEquals(Payment::STATUS_COMPLETED, $payment->status);
        $this->assertNotNull($payment->paid_at);
        $this->assertEquals('ref-123', $payment->gateway_reference);

        // Replaying the webhook must not change status (idempotent).
        $service->completeGatewayPayment($payment, 'ref-123');
        $this->assertEquals(Payment::STATUS_COMPLETED, $payment->fresh()->status);
    }

    public function test_complete_gateway_payment_ignores_non_pending(): void
    {
        $payment = Payment::factory()->create(['status' => Payment::STATUS_COMPLETED]);
        $service = app(EscrowService::class);

        $result = $service->completeGatewayPayment($payment, 'ref-xyz');

        $this->assertSame($payment->id, $result->id);
        $this->assertEquals(Payment::STATUS_COMPLETED, $payment->fresh()->status);
    }

    public function test_is_within_dispute_window_requires_completed_at(): void
    {
        $ride = Ride::factory()->create(['completed_at' => now()]);
        $service = app(EscrowService::class);

        $this->assertTrue($service->isWithinDisputeWindow($ride));

        $rideNoCompletion = Ride::factory()->create(['completed_at' => null]);
        $this->assertFalse($service->isWithinDisputeWindow($rideNoCompletion));
    }

    public function test_release_completed_rides_returns_zero_with_no_eligible(): void
    {
        $service = app(EscrowService::class);

        $this->assertEquals(0, $service->releaseCompletedRides());
    }
}
