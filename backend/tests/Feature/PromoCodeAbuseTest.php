<?php

namespace Tests\Feature;

use App\Models\PromoCode;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PromoCodeAbuseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
    }

    private function createRider(): User
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        return $rider;
    }

    // ─── Max uses ────────────────────────────────────────────────────────

    public function test_promo_rejected_when_max_uses_reached(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'MAXEDOUT',
            'type' => 'fixed',
            'value' => 20.00,
            'is_active' => true,
            'max_uses' => 5,
            'used_count' => 5,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'MAXEDOUT',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_promo_accepted_below_max_uses(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'STILLGOOD',
            'type' => 'fixed',
            'value' => 20.00,
            'is_active' => true,
            'max_uses' => 5,
            'used_count' => 3,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'STILLGOOD',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('valid', true);
    }

    public function test_promo_unlimited_uses_always_valid(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'UNLIMITED',
            'type' => 'percentage',
            'value' => 10,
            'is_active' => true,
            'max_uses' => null,
            'current_uses' => 999,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'UNLIMITED',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('valid', true);
    }

    // ─── Expiry ──────────────────────────────────────────────────────────

    public function test_expired_promo_rejected(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'OLDNEWS',
            'type' => 'fixed',
            'value' => 15.00,
            'is_active' => true,
            'starts_at' => now()->subDays(60),
            'expires_at' => now()->subDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'OLDNEWS',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_not_yet_started_promo_rejected(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'TOOEARLY',
            'type' => 'fixed',
            'value' => 25.00,
            'is_active' => true,
            'starts_at' => now()->addDays(7),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'TOOEARLY',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }

    public function test_promo_within_valid_window_accepted(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'Justright',
            'type' => 'percentage',
            'value' => 15,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'Justright',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('valid', true);
    }

    // ─── Minimum amount ──────────────────────────────────────────────────

    public function test_promo_with_minimum_amount_rejected_on_cheap_ride(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'MINRIDE',
            'type' => 'percentage',
            'value' => 10,
            'is_active' => true,
            'min_ride_amount' => 200.00,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 80.00,
        ]);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/apply-promo", [
            'code' => 'MINRIDE',
        ]);

        $response->assertStatus(422);
    }

    public function test_promo_with_minimum_amount_accepted_on_expensive_ride(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'MINRIDE2',
            'type' => 'percentage',
            'value' => 10,
            'is_active' => true,
            'min_ride_amount' => 100.00,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 250.00,
        ]);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/apply-promo", [
            'code' => 'MINRIDE2',
        ]);

        $response->assertStatus(200);
    }

    // ─── Abuse patterns ──────────────────────────────────────────────────

    public function test_same_user_cannot_apply_same_promo_twice_to_different_rides(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $promo = PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'SINGLEUSE',
            'type' => 'fixed',
            'value' => 10.00,
            'is_active' => true,
            'max_uses' => 1,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $ride1 = Ride::create([
            'rider_id' => $rider->id,
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

        $this->postJson("/api/v1/rides/{$ride1->id}/apply-promo", [
            'code' => 'SINGLEUSE',
        ]);

        $ride2 = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9500,
            'pickup_longitude' => 29.4800,
            'pickup_address' => '789 Pine Rd',
            'dropoff_latitude' => -23.9600,
            'dropoff_longitude' => 29.4900,
            'dropoff_address' => '321 Elm St',
            'total_fare' => 200.00,
        ]);

        $response = $this->postJson("/api/v1/rides/{$ride2->id}/apply-promo", [
            'code' => 'SINGLEUSE',
        ]);

        $response->assertStatus(422);
    }

    public function test_percentage_promo_discount_capped_at_max_discount(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $promo = PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'CAPPED100',
            'type' => 'percentage',
            'value' => 50,
            'is_active' => true,
            'max_discount' => 100.00,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'searching',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 500.00,
        ]);

        $response = $this->postJson("/api/v1/rides/{$ride->id}/apply-promo", [
            'code' => 'CAPPED100',
        ]);

        $response->assertStatus(200);
        $discount = $response->json('discount.discount');
        $this->assertLessThanOrEqual(100.00, $discount);
    }

    public function test_inactive_promo_cannot_be_applied(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        PromoCode::create([
            'tenant_id' => $rider->tenant_id,
            'code' => 'DEACTIVATED',
            'type' => 'fixed',
            'value' => 20.00,
            'is_active' => false,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(30),
        ]);

        $response = $this->postJson('/api/v1/promo-codes/validate', [
            'code' => 'DEACTIVATED',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('valid', false);
    }
}
