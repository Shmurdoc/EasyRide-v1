<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DataRightsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function createRider(): User
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        return $rider;
    }

    // ─── Export ──────────────────────────────────────────────────────────

    public function test_export_data_returns_all_sections(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/data/export');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'profile',
                    'rides',
                    'payments',
                    'consents',
                    'kyc',
                ],
            ]);
    }

    public function test_export_data_contains_user_profile(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/data/export');

        $response->assertOk();
        $profile = $response->json('data.profile');
        $this->assertEquals($rider->name, $profile['name']);
        $this->assertEquals($rider->email, $profile['email']);
    }

    public function test_unauthenticated_cannot_export_data(): void
    {
        $response = $this->getJson('/api/v1/data/export');

        $response->assertStatus(401);
    }

    // ─── Anonymize ───────────────────────────────────────────────────────

    public function test_user_can_request_anonymization(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/data/anonymize');

        $response->assertOk()
            ->assertJsonPath('message', 'Your account has been anonymized');
    }

    public function test_unauthenticated_cannot_anonymize(): void
    {
        $response = $this->postJson('/api/v1/data/anonymize');

        $response->assertStatus(401);
    }

    // ─── Erasure ─────────────────────────────────────────────────────────

    public function test_user_can_request_erasure(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->deleteJson('/api/v1/data/erasure');

        $response->assertOk()
            ->assertJsonPath('message', 'Your data has been deleted');
    }

    public function test_unauthenticated_cannot_request_erasure(): void
    {
        $response = $this->deleteJson('/api/v1/data/erasure');

        $response->assertStatus(401);
    }

    // ─── Admin data retention ────────────────────────────────────────────

    public function test_admin_can_view_retention_info(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/compliance/data-retention');

        $response->assertOk()
            ->assertJsonStructure(['retention']);
    }

    public function test_non_admin_cannot_view_retention_info(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/admin/compliance/data-retention');

        $response->assertStatus(403);
    }

    public function test_admin_can_trigger_cleanup(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/compliance/data-retention/cleanup');

        $response->assertOk()
            ->assertJsonPath('message', 'Cleanup completed');
    }

    public function test_non_admin_cannot_trigger_cleanup(): void
    {
        $rider = $this->createRider();
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/admin/compliance/data-retention/cleanup');

        $response->assertStatus(403);
    }
}
