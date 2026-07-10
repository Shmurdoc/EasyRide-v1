<?php

namespace Tests\Unit\Jobs;

use App\Jobs\ProcessPaymentJob;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use App\Services\EscrowService;
use App\Services\NotificationService;
use App\Services\PaymentService;
use App\Services\SocketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Mockery;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProcessPaymentJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_job_dispatches_on_horizon_queue(): void
    {
        Bus::fake();

        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = Ride::factory()->create(['rider_id' => $rider->id]);

        ProcessPaymentJob::dispatch($ride->id, 'wallet');

        Bus::assertDispatched(ProcessPaymentJob::class);
    }

    public function test_queue_is_horizon(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = Ride::factory()->create(['rider_id' => $rider->id]);

        $job = new ProcessPaymentJob($ride->id, 'wallet');

        $this->assertEquals('horizon', $job->queue);
    }

    public function test_handle_calls_process_payment(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $ride = Ride::factory()->create(['rider_id' => $rider->id]);

        $paymentService = $this->createMock(PaymentService::class);
        $escrowService = $this->createMock(EscrowService::class);
        $notificationService = $this->createMock(NotificationService::class);
        $socketService = Mockery::mock(SocketService::class);
        $socketService->shouldReceive('broadcastToRide')->once();

        $payment = Payment::factory()->create([
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'status' => 'pending',
        ]);

        $paymentService->expects($this->once())
            ->method('processPayment')
            ->with(
                $this->callback(fn ($r): bool => $r instanceof Ride && $r->id === $ride->id),
                'wallet',
                [],
            )
            ->willReturn($payment);

        $job = new ProcessPaymentJob($ride->id, 'wallet');
        $job->handle($paymentService, $escrowService, $notificationService, $socketService);
    }
}
