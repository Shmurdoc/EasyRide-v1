<?php

namespace Tests\Feature;

use App\Models\ReferralCode;
use App\Models\ReferralRedemption;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReferralTest extends TestCase
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

    public function test_user_can_get_their_referral_code(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/referrals/my-code');

        $response->assertOk()
            ->assertJsonStructure(['code', 'usage_count', 'max_uses']);
    }

    public function test_user_gets_same_code_on_subsequent_requests(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $this->getJson('/api/v1/referrals/my-code');
        $response = $this->getJson('/api/v1/referrals/my-code');

        $response->assertOk();
        $this->assertEquals(1, ReferralCode::where('user_id', $rider->id)->count());
    }

    public function test_user_can_apply_valid_referral_code(): void
    {
        $referrer = $this->createRider();
        $referred = $this->createRider();

        Sanctum::actingAs($referrer);
        $this->getJson('/api/v1/referrals/my-code');

        $code = ReferralCode::where('user_id', $referrer->id)->first();

        Sanctum::actingAs($referred);
        $response = $this->postJson('/api/v1/referrals/apply', [
            'code' => $code->code,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['referrer_name', 'bonus_amount']);

        $this->assertDatabaseHas('referral_redemptions', [
            'referrer_id' => $referrer->id,
            'referred_id' => $referred->id,
        ]);

        $code->refresh();
        $this->assertEquals(1, $code->usage_count);
    }

    public function test_user_cannot_apply_own_referral_code(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $this->getJson('/api/v1/referrals/my-code');
        $code = ReferralCode::where('user_id', $rider->id)->first();

        $response = $this->postJson('/api/v1/referrals/apply', [
            'code' => $code->code,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_user_cannot_be_referred_twice(): void
    {
        $referrer1 = $this->createRider();
        $referrer2 = $this->createRider();
        $referred = $this->createRider();

        Sanctum::actingAs($referrer1);
        $this->getJson('/api/v1/referrals/my-code');
        $code1 = ReferralCode::where('user_id', $referrer1->id)->first();

        Sanctum::actingAs($referred);
        $this->postJson('/api/v1/referrals/apply', ['code' => $code1->code]);

        Sanctum::actingAs($referrer2);
        $this->getJson('/api/v1/referrals/my-code');
        $code2 = ReferralCode::where('user_id', $referrer2->id)->first();

        Sanctum::actingAs($referred);
        $response = $this->postJson('/api/v1/referrals/apply', [
            'code' => $code2->code,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_apply_rejects_invalid_code(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/referrals/apply', [
            'code' => 'INVALID000',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_apply_validates_required_code(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/referrals/apply', []);

        $response->assertStatus(422);
    }

    public function test_user_can_view_referral_stats(): void
    {
        $referrer = $this->createRider();
        Sanctum::actingAs($referrer);

        $this->getJson('/api/v1/referrals/my-code');

        $response = $this->getJson('/api/v1/referrals/stats');

        $response->assertOk()
            ->assertJsonStructure(['code', 'total_referrals', 'total_bonus', 'pending_bonus']);
    }

    public function test_referral_stats_reflects_redemptions(): void
    {
        $referrer = $this->createRider();
        $referred = $this->createRider();

        Sanctum::actingAs($referrer);
        $this->getJson('/api/v1/referrals/my-code');
        $code = ReferralCode::where('user_id', $referrer->id)->first();

        Sanctum::actingAs($referred);
        $this->postJson('/api/v1/referrals/apply', ['code' => $code->code]);

        Sanctum::actingAs($referrer);
        $response = $this->getJson('/api/v1/referrals/stats');

        $response->assertOk()
            ->assertJsonPath('total_referrals', 1)
            ->assertJsonPath('total_bonus', 25);
    }

    public function test_unauthenticated_cannot_access_referral_routes(): void
    {
        $this->getJson('/api/v1/referrals/my-code')->assertStatus(401);
        $this->postJson('/api/v1/referrals/apply', ['code' => 'TEST'])->assertStatus(401);
        $this->getJson('/api/v1/referrals/stats')->assertStatus(401);
    }
}
