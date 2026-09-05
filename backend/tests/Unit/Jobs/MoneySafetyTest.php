<?php

namespace Tests\Unit\Jobs;

use App\Exceptions\PaymentAlreadyHeldException;
use App\Jobs\ProcessPaymentJob;
use App\Jobs\ProcessPayoutJob;
use App\Jobs\ReleaseEscrowJob;
use App\Models\DriverPayout;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\EscrowService;
use App\Services\NotificationService;
use App\Services\Payment\PayoutService;
use App\Services\PaymentService;
use App\Services\RefundService;
use App\Services\RideService;
use App\Services\SocketService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Str;
use Mockery;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Regression tests for money-movement holes (TASK-DBG-001).
 *
 * Each test simulates an exploit / double-charge scenario:
 * queue retry, concurrent duplicate request, scheduler overlap.
 */
class MoneySafetyTest extends TestCase
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

    private function makeFundedRide(float $riderBalance = 10000.0, float $fare = 150.0): Ride
    {
        $ride = Ride::factory()->create(['status' => 'completed', 'total_fare' => $fare]);
        $rider = $ride->rider;
        $rider->assignRole('rider');

        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($rider);
        $wallets->credit($wallet, $riderBalance, 'test_funding', Str::uuid()->toString(), 'Test seed funds');

        return $ride->fresh();
    }

    private function runPaymentJob(Ride $ride, string $method = 'wallet'): void
    {
        $socket = Mockery::mock(SocketService::class);
        $socket->shouldReceive('broadcastToRide')->zeroOrMoreTimes();

        (new ProcessPaymentJob($ride->id, $method))->handle(
            app(PaymentService::class),
            app(EscrowService::class),
            $this->createMock(NotificationService::class),
            $socket,
        );
    }

    public function test_payment_job_retried_twice_charges_once(): void
    {
        $ride = $this->makeFundedRide();
        $riderWallet = app(WalletService::class)->getOrCreateWallet($ride->rider);
        $before = (float) $riderWallet->fresh()->balance;

        // Simulate queue redelivery: handle() runs twice for one job.
        $this->runPaymentJob($ride);
        $this->runPaymentJob($ride);

        $this->assertEquals(1, Payment::where('ride_id', $ride->id)->count());
        $this->assertEquals(
            round($before - (float) $ride->total_fare, 2),
            round((float) $riderWallet->fresh()->balance, 2)
        );
    }

    public function test_concurrent_second_payment_for_same_ride_is_rejected(): void
    {
        $ride = $this->makeFundedRide();

        app(PaymentService::class)->processPayment($ride, 'wallet');

        // A concurrent duplicate (double-click, racing worker) must not mint
        // a second payment/debit.
        $this->expectException(PaymentAlreadyHeldException::class);
        app(PaymentService::class)->processPayment($ride, 'wallet');
    }

    public function test_concurrent_ride_completions_cannot_double_pay(): void
    {
        $ride = Ride::factory()->create(['status' => 'in_progress']);

        // Seed a valid GPS trail so fare calculation uses the offline
        // gps_tracking path (no OSRM HTTP call in tests).
        foreach ([0, 1, 2] as $i) {
            \App\Models\RideLocationLog::create([
                'ride_id' => $ride->id,
                'driver_id' => $ride->rider_id,
                'latitude' => -23.9468 + $i * 0.0005,
                'longitude' => 29.4726 + $i * 0.0005,
                'is_spoofed' => false,
                'recorded_at' => now()->subMinutes(10 - $i),
            ]);
        }

        app(RideService::class)->completeRide($ride);

        try {
            app(RideService::class)->completeRide($ride->fresh());
            $this->fail('Second completion should throw.');
        } catch (\RuntimeException) {
            // Expected: status guard + row lock reject the replay.
        }

        $this->assertEquals('completed', $ride->fresh()->status->value);
        $this->assertEquals(0, Payment::where('ride_id', $ride->id)->count());
        $this->assertEquals(
            0,
            WalletTransaction::where('reference_type', 'ride_earnings')->where('reference_id', $ride->id)->count()
        );
    }

    public function test_payout_job_run_twice_debits_once(): void
    {
        $tenant = Tenant::create(['name' => 'Test', 'slug' => uniqid('t-')]);
        $driver = User::factory()->create(['tenant_id' => $tenant->id]);
        $driver->assignRole('driver');
        Wallet::factory()->create(['user_id' => $driver->id, 'tenant_id' => $tenant->id, 'balance' => 1000.00]);

        $payout = DriverPayout::create([
            'tenant_id' => $tenant->id,
            'driver_id' => $driver->id,
            'amount' => 500.00,
            'method' => 'wallet',
            'status' => 'pending',
        ]);

        // Simulate retry after the first attempt seemingly failed.
        (new ProcessPayoutJob($payout))->handle();
        $reference = $payout->fresh()->reference;
        (new ProcessPayoutJob($payout->fresh()))->handle();

        $this->assertEquals('completed', $payout->fresh()->status);
        $this->assertEquals(500.00, (float) Wallet::where('user_id', $driver->id)->first()->balance);
        $this->assertEquals(
            1,
            WalletTransaction::where('reference_type', 'payout')->where('reference_id', $payout->id)->count()
        );
        // Reference must be stable across retries for reconciliation.
        $this->assertEquals($reference, $payout->fresh()->reference);
    }

    public function test_payout_scheduler_overlap_queues_single_payout(): void
    {
        Bus::fake();

        $tenant = Tenant::create(['name' => 'Test', 'slug' => uniqid('t-')]);
        $driver = User::factory()->create(['tenant_id' => $tenant->id]);
        $driver->assignRole('driver');
        $driver->driverProfile()->create(['is_approved' => true, 'is_verified' => true]);
        Wallet::factory()->create(['user_id' => $driver->id, 'tenant_id' => $tenant->id, 'balance' => 500.00]);

        $service = app(PayoutService::class);

        // Overlapping scheduler runs (daily + weekly + manual) must not each
        // mint a full-balance payout (pending_payout double-counting).
        $this->assertEquals(1, $service->processDailyPayouts());
        $this->assertEquals(0, $service->processDailyPayouts());
        $this->assertEquals(0, $service->processPayouts());
        $this->assertEquals(1, DriverPayout::where('driver_id', $driver->id)->count());
    }

    public function test_topup_confirm_replayed_webhook_credits_once(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($rider);

        $tx = $wallets->initiateTopUp($wallet, 250.00, 'payfast');

        // Gateway webhook delivered twice (retry/replay).
        $this->assertTrue($wallets->confirmTopUpByGatewayReference((string) $tx->gateway_reference));
        $this->assertFalse($wallets->confirmTopUpByGatewayReference((string) $tx->gateway_reference));

        $this->assertEquals(250.00, (float) $wallet->fresh()->balance);
        $this->assertEquals(0.00, (float) $wallet->fresh()->pending_balance);
    }

    public function test_escrow_release_job_retried_credits_driver_once(): void
    {
        $ride = Ride::factory()->create(['status' => 'completed', 'total_fare' => 200.00]);
        $driver = User::factory()->create();
        $driver->assignRole('driver');
        $ride->update(['driver_id' => $driver->id]);

        // holdPayment with method wallet debits the rider: fund them first.
        $wallets = app(WalletService::class);
        $riderWallet = $wallets->getOrCreateWallet($ride->rider);
        $wallets->credit($riderWallet, 10000.0, 'test_funding', Str::uuid()->toString(), 'Test seed funds');

        $escrow = app(EscrowService::class);
        $payment = $escrow->holdPayment($ride->fresh(), 'wallet', ['idempotency_key' => "ride:{$ride->id}:payment"]);

        // Release sweeper + manual dispatch race: run twice.
        (new ReleaseEscrowJob($payment->fresh()))->handle($escrow);
        (new ReleaseEscrowJob($payment->fresh()))->handle($escrow);

        $driverWallet = Wallet::where('user_id', $driver->id)->first();
        $expected = round((float) $payment->driver_payout, 2);
        $this->assertEquals($expected, round((float) $driverWallet->fresh()->balance, 2));
        $this->assertEquals(
            1,
            WalletTransaction::where('wallet_id', $driverWallet->id)
                ->where('reference_type', 'ride_earnings')
                ->where('reference_id', $ride->id)
                ->count()
        );
        $this->assertTrue((bool) $payment->fresh()->escrow_released);
    }

    public function test_no_show_refund_on_already_refunded_payment_mints_nothing(): void
    {
        $ride = Ride::factory()->create(['status' => 'completed', 'total_fare' => 120.00]);
        $driver = User::factory()->create();
        $driver->assignRole('driver');
        $ride->update(['driver_id' => $driver->id]);

        $payment = Payment::factory()->create([
            'ride_id' => $ride->id,
            'payer_id' => $ride->rider_id,
            'amount' => 120.00,
            'driver_payout' => 100.00,
            'method' => 'wallet',
            'gateway' => 'wallet',
            'status' => Payment::STATUS_REFUNDED,
        ]);

        $driverWalletBefore = (float) app(WalletService::class)->getOrCreateWallet($driver)->balance;

        $result = app(RefundService::class)->processDriverNoShowRefund($ride->fresh());

        $this->assertFalse($result['success']);
        $this->assertEquals(
            $driverWalletBefore,
            (float) app(WalletService::class)->getOrCreateWallet($driver)->fresh()->balance
        );
        $this->assertEquals(
            0,
            WalletTransaction::where('reference_type', 'ride_earnings')->where('reference_id', $ride->id)->count()
        );
    }
}
