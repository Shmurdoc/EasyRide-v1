<?php

namespace Tests\Unit\Jobs;

use App\Jobs\ReleaseEscrowJob;
use App\Models\Payment;
use App\Services\EscrowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class ReleaseEscrowJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_dispatches_correctly(): void
    {
        Bus::fake();

        $payment = Payment::factory()->create();

        ReleaseEscrowJob::dispatch($payment);

        Bus::assertDispatched(ReleaseEscrowJob::class);
    }

    public function test_handle_calls_release_payment(): void
    {
        $payment = Payment::factory()->create();

        $escrow = $this->createMock(EscrowService::class);
        $escrow->expects($this->once())
            ->method('releasePayment')
            ->with($payment);

        $job = new ReleaseEscrowJob($payment);
        $job->handle($escrow);
    }

    public function test_handle_logs_and_throws_on_failure(): void
    {
        $payment = Payment::factory()->create();

        $escrow = $this->createMock(EscrowService::class);
        $escrow->method('releasePayment')
            ->willThrowException(new \Exception('Gateway timeout'));

        $job = new ReleaseEscrowJob($payment);
        $job->tries = 3;

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Gateway timeout');

        $job->handle($escrow);
    }

    public function test_job_has_three_tries(): void
    {
        $payment = Payment::factory()->create();

        $this->assertEquals(3, (new ReleaseEscrowJob($payment))->tries);
    }

    public function test_job_backoff_is_sixty_seconds(): void
    {
        $payment = Payment::factory()->create();

        $this->assertEquals(60, (new ReleaseEscrowJob($payment))->backoff);
    }
}
