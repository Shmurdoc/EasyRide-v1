<?php

namespace Tests\Unit\Jobs;

use App\Jobs\ProcessPayoutJob;
use App\Models\DriverPayout;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProcessPayoutJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
    }

    private function createPayout(array $overrides = []): DriverPayout
    {
        $tenant = Tenant::create(['name' => 'Test', 'slug' => uniqid('tenant-')]);
        $driver = User::factory()->create(['tenant_id' => $tenant->id]);
        $driver->assignRole('driver');

        return DriverPayout::create(array_merge([
            'tenant_id' => $tenant->id,
            'driver_id' => $driver->id,
            'amount' => 500.00,
            'method' => 'wallet',
            'status' => 'pending',
            'period_start' => now()->subWeek(),
            'period_end' => now(),
        ], $overrides));
    }

    public function test_job_dispatches_correctly(): void
    {
        Bus::fake();

        $payout = $this->createPayout();
        ProcessPayoutJob::dispatch($payout);

        Bus::assertDispatched(ProcessPayoutJob::class);
    }

    public function test_handle_processes_payout_with_wallet_decrement(): void
    {
        $tenant = Tenant::create(['name' => 'Test', 'slug' => uniqid('tenant-')]);
        $driver = User::factory()->create(['tenant_id' => $tenant->id]);
        $driver->assignRole('driver');

        Wallet::factory()->create([
            'user_id' => $driver->id,
            'balance' => 1000.00,
        ]);

        $payout = DriverPayout::create([
            'tenant_id' => $tenant->id,
            'driver_id' => $driver->id,
            'amount' => 500.00,
            'method' => 'wallet',
            'status' => 'pending',
        ]);

        (new ProcessPayoutJob($payout))->handle();

        $payout->refresh();
        $this->assertEquals('completed', $payout->status);
        $this->assertStringStartsWith('PAY-', $payout->reference);
        $this->assertNotNull($payout->processed_at);

        $wallet = Wallet::where('user_id', $driver->id)->first();
        $this->assertEquals(500.00, (float) $wallet->balance);
    }

    public function test_handle_handles_missing_wallet_gracefully(): void
    {
        $payout = $this->createPayout(['amount' => 200.00]);
        (new ProcessPayoutJob($payout))->handle();

        $payout->refresh();
        $this->assertEquals('failed', $payout->status);
        $this->assertNotNull($payout->notes);
    }

    public function test_job_has_three_tries(): void
    {
        $payout = $this->createPayout(['amount' => 100.00]);
        $this->assertEquals(3, (new ProcessPayoutJob($payout))->tries);
    }

    public function test_job_backoff_is_one_hour(): void
    {
        $payout = $this->createPayout(['amount' => 100.00]);
        $this->assertEquals(3600, (new ProcessPayoutJob($payout))->backoff);
    }
}
