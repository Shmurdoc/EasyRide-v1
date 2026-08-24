<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ConsentExtendedTest extends TestCase
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

    // ─── Grant ───────────────────────────────────────────────────────────

    public function test_grant_multiple_consents(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/consent/grant', [
            'consent_type' => 'terms_of_service',
            'consent_version' => '1.0',
        ]);

        $response = $this->postJson('/api/v1/consent/grant', [
            'consent_type' => 'privacy_policy',
            'consent_version' => '2.0',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Consent granted');
    }

    public function test_grant_consent_requires_type(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/consent/grant', [
            'consent_version' => '1.0',
        ]);

        $response->assertStatus(422);
    }

    public function test_revoke_consent_requires_type(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/consent/revoke', []);

        $response->assertStatus(422);
    }

    // ─── Revoke ──────────────────────────────────────────────────────────

    public function test_revoke_already_revoked_consent(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/consent/grant', [
            'consent_type' => 'marketing_email',
            'consent_version' => '1.0',
        ]);

        $this->postJson('/api/v1/consent/revoke', [
            'consent_type' => 'marketing_email',
        ]);

        $response = $this->postJson('/api/v1/consent/revoke', [
            'consent_type' => 'marketing_email',
        ]);

        $response->assertOk();
    }

    public function test_revoke_never_granted_consent(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/consent/revoke', [
            'consent_type' => 'marketing_sms',
        ]);

        $response->assertOk();
    }

    // ─── History ─────────────────────────────────────────────────────────

    public function test_consent_history_tracks_grants_and_revocations(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $this->postJson('/api/v1/consent/grant', [
            'consent_type' => 'analytics',
            'consent_version' => '1.0',
        ]);

        $this->postJson('/api/v1/consent/revoke', [
            'consent_type' => 'analytics',
        ]);

        $response = $this->getJson('/api/v1/consent/history');

        $response->assertOk()
            ->assertJsonStructure(['history']);
    }

    public function test_consent_history_empty_for_new_user(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/consent/history');

        $response->assertOk()
            ->assertJsonPath('history', []);
    }

    // ─── Isolation ───────────────────────────────────────────────────────

    public function test_users_cannot_see_each_others_consents(): void
    {
        $rider1 = $this->createRider();
        $rider2 = $this->createRider();

        Sanctum::actingAs($rider1);
        $this->postJson('/api/v1/consent/grant', [
            'consent_type' => 'terms_of_service',
            'consent_version' => '1.0',
        ]);

        Sanctum::actingAs($rider2);
        $response = $this->getJson('/api/v1/consent');

        $response->assertOk();
        $consents = $response->json('consents');
        $types = array_column($consents, 'consent_type');
        $this->assertNotContains('terms_of_service', $types);
    }

    // ─── Auth ────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_grant_consent(): void
    {
        $response = $this->postJson('/api/v1/consent/grant', [
            'consent_type' => 'terms_of_service',
            'consent_version' => '1.0',
        ]);

        $response->assertStatus(401);
    }

    public function test_unauthenticated_cannot_revoke_consent(): void
    {
        $response = $this->postJson('/api/v1/consent/revoke', [
            'consent_type' => 'terms_of_service',
        ]);

        $response->assertStatus(401);
    }

    public function test_unauthenticated_cannot_view_consent_history(): void
    {
        $response = $this->getJson('/api/v1/consent/history');
        $response->assertStatus(401);
    }
}
