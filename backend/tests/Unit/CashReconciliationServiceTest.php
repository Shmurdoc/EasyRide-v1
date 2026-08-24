<?php

namespace Tests\Unit;

use App\Models\Ride;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Payment\CashReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CashReconciliationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_mark_cash_paid_creates_reconciliation(): void
    {
        $driver = User::factory()->create(['role' => 'driver']);
        Wallet::factory()->create(['user_id' => $driver->id, 'balance' => 500]);
        $ride = Ride::factory()->create([
            'driver_id' => $driver->id,
            'total_fare' => 100,
            'status' => 'completed',
        ]);

        $service = app(CashReconciliationService::class);
        $reconciliation = $service->markCashPaid($ride);

        $this->assertNotNull($reconciliation);
        $this->assertEquals($ride->total_fare, $reconciliation->fare_amount);
        $this->assertGreaterThan(0, $reconciliation->platform_fee);
    }

    public function test_reconcile_by_driver_returns_array(): void
    {
        $service = app(CashReconciliationService::class);
        $result = $service->reconcileByDriver(Str::uuid()->toString(), now()->toDateString());

        $this->assertIsArray($result);
    }
}
