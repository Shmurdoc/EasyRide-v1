<?php

namespace Tests\Feature;

use App\Models\SurgeZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SurgeZoneControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    public function test_admin_can_list_surge_zones(): void
    {
        Sanctum::actingAs($this->admin);

        SurgeZone::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'CBD Surge',
            'center_lat' => -23.9468,
            'center_lng' => 29.4726,
            'radius_meters' => 1000,
            'multiplier' => 1.50,
        ]);

        $response = $this->getJson('/api/v1/admin/surge-zones');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_admin_can_create_surge_zone(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/surge-zones', [
            'name' => 'Airport Surge',
            'center_lat' => -23.9500,
            'center_lng' => 29.4800,
            'radius_meters' => 2000,
            'multiplier' => 1.75,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Airport Surge');

        $this->assertDatabaseHas('surge_zones', [
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Airport Surge',
        ]);
    }

    public function test_admin_can_update_surge_zone(): void
    {
        Sanctum::actingAs($this->admin);

        $surgeZone = SurgeZone::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Original Zone',
            'center_lat' => -23.9468,
            'center_lng' => 29.4726,
            'radius_meters' => 1000,
            'multiplier' => 1.50,
        ]);

        $response = $this->putJson("/api/v1/admin/surge-zones/{$surgeZone->id}", [
            'name' => 'Updated Zone',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Zone');
    }

    public function test_admin_can_delete_surge_zone(): void
    {
        Sanctum::actingAs($this->admin);

        $surgeZone = SurgeZone::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'To Delete',
            'center_lat' => -23.9468,
            'center_lng' => 29.4726,
            'radius_meters' => 1000,
            'multiplier' => 1.25,
        ]);

        $response = $this->deleteJson("/api/v1/admin/surge-zones/{$surgeZone->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('surge_zones', ['id' => $surgeZone->id]);
    }

    public function test_admin_can_toggle_surge_zone(): void
    {
        Sanctum::actingAs($this->admin);

        $surgeZone = SurgeZone::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Toggle Test',
            'center_lat' => -23.9468,
            'center_lng' => 29.4726,
            'radius_meters' => 1000,
            'multiplier' => 1.50,
            'is_active' => true,
        ]);

        $response = $this->patchJson("/api/v1/admin/surge-zones/{$surgeZone->id}/toggle");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $surgeZone->refresh();
        $this->assertFalse($surgeZone->is_active);
    }

    public function test_unauthorized_user_cannot_manage_surge_zones(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/admin/surge-zones');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_surge_zones(): void
    {
        $response = $this->getJson('/api/v1/admin/surge-zones');

        $response->assertStatus(401);
    }

    public function test_create_surge_zone_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/surge-zones', []);

        $response->assertStatus(422);
    }

    public function test_create_surge_zone_validates_latitude_range(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/surge-zones', [
            'name' => 'Invalid Lat',
            'center_lat' => 100,
            'center_lng' => 29.4726,
            'radius_meters' => 1000,
            'multiplier' => 1.50,
        ]);

        $response->assertStatus(422);
    }

    public function test_create_surge_zone_validates_radius_range(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/surge-zones', [
            'name' => 'Invalid Radius',
            'center_lat' => -23.9468,
            'center_lng' => 29.4726,
            'radius_meters' => 50,
            'multiplier' => 1.50,
        ]);

        $response->assertStatus(422);
    }

    public function test_create_surge_zone_validates_multiplier_range(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/surge-zones', [
            'name' => 'Invalid Multiplier',
            'center_lat' => -23.9468,
            'center_lng' => 29.4726,
            'radius_meters' => 1000,
            'multiplier' => 3.00,
        ]);

        $response->assertStatus(422);
    }
}
