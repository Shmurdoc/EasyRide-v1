<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\DriverProfile;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\DriverService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverServiceTest extends TestCase
{
    use RefreshDatabase;

    private DriverService $driverService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->driverService = new DriverService(new WalletService);
    }

    private function createDriver(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => \Str::uuid()->toString(),
            'name' => 'Test Driver',
            'email' => uniqid('driver_') . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'driver',
            'phone_number' => '+27800000000',
            'is_verified' => true,
        ], $overrides));
    }

    // ── registerDriver ──────────────────────────────────────────

    public function test_register_driver_creates_driver_profile(): void
    {
        $user = $this->createDriver();

        $result = $this->driverService->registerDriver($user, [
            'license_number' => 'ZA123456',
            'license_expiry' => now()->addYear()->format('Y-m-d'),
            'id_number' => '9001011234080',
            'date_of_birth' => '1990-01-01',
        ]);

        $this->assertInstanceOf(DriverProfile::class, $result);
        $this->assertDatabaseHas('driver_profiles', [
            'user_id' => $user->id,
        ]);
        // license_number is encrypted — verify via model accessor
        $profile = \App\Models\DriverProfile::where('user_id', $user->id)->first();
        $this->assertEquals('ZA123456', $profile->license_number);
    }

    public function test_register_driver_fails_when_profile_already_exists(): void
    {
        $user = $this->createDriver();

        DriverProfile::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $user->id,
            'license_number' => 'EXISTS001',
            'id_number' => '9001011234080',
            'is_verified' => true,
            'is_approved' => true,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('already has a driver profile');

        $this->driverService->registerDriver($user, [
            'license_number' => 'NEW123',
            'license_expiry' => now()->addYear()->format('Y-m-d'),
            'id_number' => '9001011234080',
            'date_of_birth' => '1990-01-01',
        ]);
    }

    // ── toggleOnline ────────────────────────────────────────────

    public function test_toggle_online_changes_online_state(): void
    {
        $user = $this->createDriver(['is_online' => false]);

        DriverProfile::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $user->id,
            'license_number' => 'ZA999999',
            'id_number' => '9001011234080',
            'is_verified' => true,
            'is_approved' => true,
        ]);

        $result = $this->driverService->toggleOnline($user, true);

        $this->assertArrayHasKey('is_online', $result);
        $this->assertTrue($result['is_online']);
        $this->assertTrue($user->fresh()->is_online);
    }

    public function test_toggle_online_fails_when_not_approved(): void
    {
        $user = $this->createDriver(['is_online' => false]);

        DriverProfile::create([
            'id' => \Str::uuid()->toString(),
            'user_id' => $user->id,
            'license_number' => 'ZA888888',
            'id_number' => '9001011234080',
            'is_verified' => true,
            'is_approved' => false,
        ]);

        $this->expectException(\RuntimeException::class);

        $this->driverService->toggleOnline($user, true);
    }
}
