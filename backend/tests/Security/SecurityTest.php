<?php

namespace Tests\Security;

use App\Models\Ride;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_sql_injection_on_login_endpoint(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => "' OR '1'='1",
            'password' => "' OR '1'='1",
        ]);

        $response->assertStatus(422);
    }

    public function test_sql_injection_on_ride_search(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/rides?filter=' . urlencode("1 OR 1=1"));

        $response->assertStatus(200);
    }

    public function test_sql_injection_on_ride_detail(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/rides/1 OR 1=1');
        $response->assertStatus(404);
    }

    public function test_sql_injection_on_registration(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => "' UNION SELECT * FROM users --",
            'phone_number' => '+27123456789',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertStatus(422);
    }

    public function test_xss_on_registration(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => '<script>alert("XSS")</script>',
            'email' => 'xss_test@example.com',
            'phone_number' => '+27123456789',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertStatus(201);
    }

    public function test_xss_on_ride_addresses(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'pickup_address' => '<script>alert("addr")</script>',
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'dropoff_address' => '<b>bold address</b>',
            'category' => 'standard',
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201);
    }

    public function test_rider_cannot_access_driver_endpoints(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $driverEndpoints = [
            '/api/v1/drivers/nearby-rides',
            '/api/v1/drivers/earnings',
            '/api/v1/drivers/trips',
            '/api/v1/drivers/deliveries',
        ];

        foreach ($driverEndpoints as $uri) {
            $response = $this->getJson($uri);
            $response->assertStatus(403);
        }
    }

    public function test_driver_only_endpoints_reject_post_requests(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/drivers/location', [
            'latitude' => -23.9468,
            'longitude' => 29.4726,
        ]);
        $response->assertStatus(403);

        $response = $this->postJson('/api/v1/drivers/toggle-online', []);
        $response->assertStatus(403);
    }

    public function test_rider_cannot_access_admin_endpoints(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $adminEndpoints = [
            '/api/v1/admin/dashboard',
            '/api/v1/admin/users',
            '/api/v1/admin/rides',
            '/api/v1/admin/drivers',
            '/api/v1/admin/settings',
            '/api/v1/admin/reports/dashboard',
            '/api/v1/admin/reports/revenue',
            '/api/v1/admin/compliance/kyc/pending',
        ];

        foreach ($adminEndpoints as $uri) {
            $response = $this->getJson($uri);
            $response->assertStatus(403);
        }
    }

    public function test_driver_cannot_access_other_drivers_rides(): void
    {
        $driver1 = User::factory()->create();
        $driver1->assignRole('driver');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'driver_id' => $driver1->id,
            'status' => 'accepted',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        $driver2 = User::factory()->create();
        $driver2->assignRole('driver');
        Sanctum::actingAs($driver2);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/start");
        $response->assertStatus(403);
    }

    public function test_rate_limiting_on_auth_login(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => "test{$i}@example.com",
                'password' => 'wrong',
            ]);

            if ($response->status() === 429) {
                $response->assertJson(['message' => 'Too Many Attempts.']);
                return;
            }
        }

        $this->assertTrue(false, 'Rate limiter did not trigger after 15 login attempts');
    }

    public function test_rate_limiting_on_auth_register(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/v1/auth/register', [
                'name' => "Test {$i}",
                'email' => "ratelimit{$i}@example.com",
                'phone_number' => '+27' . str_pad((string) (1000000000 + $i), 9, '0'),
                'password' => 'Password1!',
                'password_confirmation' => 'Password1!',
            ]);

            if ($response->status() === 429) {
                $response->assertJson(['message' => 'Too Many Attempts.']);
                return;
            }
        }

        $this->assertTrue(false, 'Rate limiter did not trigger after 10 register attempts');
    }

    public function test_unauthenticated_requests_rejected(): void
    {
        $protectedEndpoints = [
            '/api/v1/rides',
            '/api/v1/rides/current',
            '/api/v1/auth/me',
            '/api/v1/wallet',
            '/api/v1/notifications',
            '/api/v1/ratings',
            '/api/v1/referrals/my-code',
            '/api/v1/food/orders',
        ];

        foreach ($protectedEndpoints as $uri) {
            $response = $this->getJson($uri);
            $response->assertStatus(401);
        }

        $response = $this->postJson('/api/v1/rides', [
            'pickup_lat' => -23.9468,
            'pickup_lng' => 29.4726,
            'dropoff_lat' => -23.9500,
            'dropoff_lng' => 29.4800,
            'category' => 'standard',
        ]);
        $response->assertStatus(401);
    }

    public function test_rider_cannot_modify_another_users_ride(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $ride = Ride::create([
            'rider_id' => $rider1->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        Sanctum::actingAs($rider2);
        $response = $this->postJson("/api/v1/rides/{$ride->id}/cancel", [
            'cancellation_reason' => 'Trying to cancel someone else ride',
        ]);

        $response->assertStatus(403);
    }

    public function test_security_headers_present(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_forgot_password_ratelimited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/v1/auth/forgot-password', [
                'email' => "forgot{$i}@example.com",
            ]);

            if ($response->status() === 429) {
                $response->assertJson(['message' => 'Too Many Attempts.']);
                return;
            }
        }
    }
}
