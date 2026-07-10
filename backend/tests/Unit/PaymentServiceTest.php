<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\PaymentService;
use App\Services\PlatformFeeService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    private function createRider(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Rider',
            'email' => uniqid('rider_') . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'rider',
            'phone_number' => '+27800000001',
            'is_active' => true,
            'is_verified' => true,
        ], $overrides));
    }

    private function createDriver(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Driver',
            'email' => uniqid('driver_') . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'driver',
            'phone_number' => '+27800000002',
            'is_active' => true,
            'is_verified' => true,
        ], $overrides));
    }

    // ── processPayment ──────────────────────────────────────────

    public function test_process_wallet_payment_decreases_wallet_balance(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();

        $wallet = Wallet::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $rider->id,
            'balance' => 100.0,
            'currency' => 'ZAR',
        ]);

        $walletService = Mockery::mock(WalletService::class);
        $walletService->shouldReceive('getOrCreateWallet')->once()->andReturn($wallet);
        $walletService->shouldReceive('debit')->once()->andReturn(
            Mockery::mock(WalletTransaction::class)->makePartial()
        );

        $platformFeeService = Mockery::mock(PlatformFeeService::class);
        $platformFeeService->shouldReceive('calculateFee')
            ->once()
            ->with(50.0, null)
            ->andReturn(7.50);

        $paymentService = new PaymentService($walletService, $platformFeeService);

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'completed',
            'category' => 'standard',
            'route_distance_km' => 10.0,
            'total_fare' => 50.00,
            'estimated_fare' => 50.00,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'payment_method' => 'wallet',
        ]);

        $result = $paymentService->processPayment($ride, 'wallet');

        $this->assertInstanceOf(Payment::class, $result);
        $this->assertEquals(PaymentStatus::COMPLETED->value, $result->status);
        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'payer_id' => $rider->id,
            'status' => PaymentStatus::COMPLETED->value,
        ]);
    }

    public function test_process_wallet_payment_fails_on_insufficient_balance(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();

        $wallet = Wallet::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $rider->id,
            'balance' => 5.0,
            'currency' => 'ZAR',
        ]);

        $walletService = Mockery::mock(WalletService::class);
        $walletService->shouldReceive('getOrCreateWallet')->once()->andReturn($wallet);
        $walletService->shouldReceive('debit')->once()->andThrow(new \RuntimeException('Insufficient wallet balance'));

        $platformFeeService = Mockery::mock(PlatformFeeService::class);
        $platformFeeService->shouldReceive('calculateFee')->once()->andReturn(7.50);

        $paymentService = new PaymentService($walletService, $platformFeeService);

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'completed',
            'category' => 'standard',
            'route_distance_km' => 10.0,
            'total_fare' => 50.00,
            'estimated_fare' => 50.00,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'payment_method' => 'wallet',
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Insufficient wallet balance');

        $paymentService->processPayment($ride, 'wallet');
    }

    public function test_process_payment_creates_platform_fee_record(): void
    {
        $rider = $this->createRider();
        $driver = $this->createDriver();

        $wallet = Wallet::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $rider->id,
            'balance' => 100.0,
            'currency' => 'ZAR',
        ]);

        $walletService = Mockery::mock(WalletService::class);
        $walletService->shouldReceive('getOrCreateWallet')->once()->andReturn($wallet);
        $walletService->shouldReceive('debit')->once()->andReturn(
            Mockery::mock(WalletTransaction::class)->makePartial()
        );

        $platformFeeService = Mockery::mock(PlatformFeeService::class);
        $platformFeeService->shouldReceive('calculateFee')
            ->once()
            ->with(50.0, null)
            ->andReturn(7.50);

        $paymentService = new PaymentService($walletService, $platformFeeService);

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => 'completed',
            'category' => 'standard',
            'route_distance_km' => 10.0,
            'total_fare' => 50.00,
            'estimated_fare' => 50.00,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'payment_method' => 'wallet',
        ]);

        $result = $paymentService->processPayment($ride, 'wallet');

        $this->assertInstanceOf(Payment::class, $result);
        $this->assertDatabaseHas('payments', [
            'ride_id' => $ride->id,
            'method' => 'wallet',
        ]);
    }
}
