<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\RideCategory;
use App\Enums\RideStatus;
use App\Models\DriverProfile;
use App\Models\Ride;
use App\Models\User;
use App\Services\CancellationService;
use App\Services\DriverFraudGuardService;
use App\Services\FareCalculationService;
use App\Services\FleetModeService;
use App\Services\NotificationService;
use App\Services\RatingService;
use App\Services\RideMatchingService;
use App\Services\RideService;
use App\Services\RideStateService;
use App\Services\RouteService;
use App\Services\SocketService;
use App\Services\SurgePricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class StubSocketService extends SocketService
{
    public static function broadcastToUser(string $userId, string $event, array $data): void {}
    public static function broadcastToDriver(string $driverId, string $event, array $data): void {}
    public static function broadcastToRide(string $rideId, string $event, array $data): void {}
    public static function broadcastToDelivery(string $deliveryId, string $event, array $data): void {}
    public static function broadcastToAdmins(string $event, array $data): void {}
    public static function broadcastToAllDrivers(string $event, array $data): void {}
    public static function broadcast(string $channel, string $event, array $data): void {}
}

class RideServiceTest extends TestCase
{
    use RefreshDatabase;

    private RideService $rideService;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::setDefaultDriver('array');

        $this->rideService = new RideService(
            new FareCalculationService(new RouteService, new SurgePricingService),
            new SurgePricingService,
            Mockery::mock(RideMatchingService::class),
            Mockery::mock(RatingService::class),
            new RouteService,
            new RideStateService(
                Mockery::mock(CancellationService::class),
                Mockery::mock(NotificationService::class),
            ),
            new StubSocketService,
            Mockery::mock(DriverFraudGuardService::class),
            new FleetModeService(new \App\Services\SettingService),
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test User',
            'email' => uniqid('user_') . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'rider',
            'phone_number' => '+27800000000',
            'is_active' => true,
            'is_verified' => true,
            'current_latitude' => -23.9468,
            'current_longitude' => 29.4726,
        ], $overrides));
    }

    private function rideData(array $overrides = []): array
    {
        return array_merge([
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_lat' => -23.9600,
            'dropoff_lng' => 29.4800,
            'pickup_address' => '123 Main St, Phalaborwa',
            'dropoff_address' => '456 Oak Ave, Phalaborwa',
            'category' => RideCategory::STANDARD->value,
            'payment_method' => 'cash',
        ], $overrides);
    }

    private function makeAcceptRideService(): RideService
    {
        $matchingService = Mockery::mock(RideMatchingService::class);
        $matchingService->shouldReceive('calculateDistance')->andReturn(2.5);
        $matchingService->shouldReceive('calculateETA')->andReturn(300);

        $fraudGuard = Mockery::mock(DriverFraudGuardService::class);
        $fraudGuard->shouldReceive('isBlockedFromAccepting')->andReturn(false);

        return new RideService(
            new FareCalculationService(new RouteService, new SurgePricingService),
            new SurgePricingService,
            $matchingService,
            Mockery::mock(RatingService::class),
            new RouteService,
            new RideStateService(
                Mockery::mock(CancellationService::class),
                Mockery::mock(NotificationService::class),
            ),
            new StubSocketService,
            $fraudGuard,
            new FleetModeService(new \App\Services\SettingService),
        );
    }

    // ── createRide ──────────────────────────────────────────────

    public function test_create_ride_success(): void
    {
        $rider = $this->createUser(['role' => 'rider']);

        $ride = $this->rideService->createRide(
            rider: $rider,
            data: $this->rideData(),
        );

        $this->assertInstanceOf(Ride::class, $ride);
        $this->assertEquals(RideStatus::SEARCHING, $ride->status);
        $this->assertEquals($rider->id, $ride->rider_id);
        $this->assertEquals(RideCategory::STANDARD->value, $ride->category);
        $this->assertDatabaseHas('rides', ['rider_id' => $rider->id]);
    }

    public function test_create_ride_applies_night_surge_multiplier(): void
    {
        $rider = $this->createUser(['role' => 'rider']);

        $ride = $this->rideService->createRide(
            rider: $rider,
            data: $this->rideData(),
        );

        $this->assertNotNull($ride->surge_multiplier);
        $this->assertGreaterThanOrEqual(1.0, (float) $ride->surge_multiplier);
    }

    public function test_create_ride_calculates_fare_estimate(): void
    {
        $rider = $this->createUser(['role' => 'rider']);

        $ride = $this->rideService->createRide(
            rider: $rider,
            data: $this->rideData(),
        );

        $this->assertNotNull($ride->total_fare);
        $this->assertGreaterThan(0, (float) $ride->total_fare);
    }

    // ── acceptRide ──────────────────────────────────────────────

    public function test_accept_ride_success(): void
    {
        $rider = $this->createUser(['role' => 'rider']);
        $driver = $this->createUser([
            'role' => 'driver',
            'is_online' => true,
            'current_latitude' => -23.9500,
            'current_longitude' => 29.4750,
        ]);

        DriverProfile::create([
            'user_id' => $driver->id,
            'is_approved' => true,
            'is_verified' => true,
            'license_number' => 'TEST123',
            'license_expiry' => now()->addYear()->toDateString(),
        ]);

        $ride = $this->rideService->createRide(
            rider: $rider,
            data: $this->rideData(),
        );

        DB::shouldReceive('transaction')->once()->andReturnUsing(function ($callback) {
            return $callback();
        });

        $service = $this->makeAcceptRideService();
        $result = $service->acceptRide($ride, $driver);

        $this->assertInstanceOf(Ride::class, $result);
        $this->assertEquals(RideStatus::ACCEPTED, $result->status);
        $this->assertEquals($driver->id, $result->driver_id);
    }

    public function test_accept_ride_fails_when_driver_offline(): void
    {
        $rider = $this->createUser(['role' => 'rider']);
        $driver = $this->createUser([
            'role' => 'driver',
            'is_online' => false,
        ]);

        DriverProfile::create([
            'user_id' => $driver->id,
            'is_approved' => true,
            'is_verified' => true,
        ]);

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'status' => RideStatus::SEARCHING,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'category' => RideCategory::STANDARD,
            'route_distance_km' => 5.0,
        ]);

        DB::shouldReceive('transaction')->once()->andReturnUsing(function ($callback) {
            return $callback();
        });

        $service = $this->makeAcceptRideService();
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('You must be online to accept rides.');

        $service->acceptRide($ride, $driver);
    }

    // ── cancelRide ──────────────────────────────────────────────

    public function test_cancel_ride_before_driver_assigned_succeeds(): void
    {
        $rider = $this->createUser(['role' => 'rider']);

        $ride = Ride::create([
            'id' => \Str::uuid()->toString(),
            'rider_id' => $rider->id,
            'status' => RideStatus::SEARCHING,
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4800,
            'category' => RideCategory::STANDARD,
            'route_distance_km' => 5.0,
            'cancellation_fee' => 0,
        ]);

        $cancellationService = Mockery::mock(CancellationService::class);
        $cancellationService->shouldReceive('calculateFee')->andReturn(['amount' => 0, 'reason' => '']);

        $notificationService = Mockery::mock(NotificationService::class);
        $notificationService->shouldReceive('notify')->zeroOrMoreTimes();

        $this->rideService = new RideService(
            new FareCalculationService(new RouteService, new SurgePricingService),
            new SurgePricingService,
            Mockery::mock(RideMatchingService::class),
            Mockery::mock(RatingService::class),
            new RouteService,
            new RideStateService($cancellationService, $notificationService),
            new StubSocketService,
            Mockery::mock(DriverFraudGuardService::class),
            new FleetModeService(new \App\Services\SettingService),
        );

        $result = $this->rideService->cancelRide($ride, 'Changed my mind', $rider->id);

        $this->assertEquals(RideStatus::CANCELLED, $result->status);
        $this->assertDatabaseHas('rides', [
            'id' => $ride->id,
            'status' => RideStatus::CANCELLED->value,
        ]);
    }
}
