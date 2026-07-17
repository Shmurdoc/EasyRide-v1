<?php

namespace Tests\Feature;

use App\Models\PeakHour;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PeakHourControllerTest extends TestCase
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

    public function test_admin_can_list_peak_hours(): void
    {
        Sanctum::actingAs($this->admin);

        PeakHour::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Morning Rush',
            'day_of_week' => 1,
            'start_time' => '07:00',
            'end_time' => '09:00',
            'multiplier' => 1.50,
        ]);

        $response = $this->getJson('/api/v1/admin/peak-hours');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_admin_can_create_peak_hour(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/peak-hours', [
            'name' => 'Evening Rush',
            'day_of_week' => 5,
            'start_time' => '17:00',
            'end_time' => '19:00',
            'multiplier' => 1.75,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Evening Rush');

        $this->assertDatabaseHas('peak_hours', [
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Evening Rush',
        ]);
    }

    public function test_admin_can_update_peak_hour(): void
    {
        Sanctum::actingAs($this->admin);

        $peakHour = PeakHour::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Original Name',
            'day_of_week' => 1,
            'start_time' => '07:00',
            'end_time' => '09:00',
            'multiplier' => 1.50,
        ]);

        $response = $this->putJson("/api/v1/admin/peak-hours/{$peakHour->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Name');
    }

    public function test_admin_can_delete_peak_hour(): void
    {
        Sanctum::actingAs($this->admin);

        $peakHour = PeakHour::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'To Delete',
            'day_of_week' => 2,
            'start_time' => '08:00',
            'end_time' => '10:00',
            'multiplier' => 1.25,
        ]);

        $response = $this->deleteJson("/api/v1/admin/peak-hours/{$peakHour->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('peak_hours', ['id' => $peakHour->id]);
    }

    public function test_admin_can_toggle_peak_hour(): void
    {
        Sanctum::actingAs($this->admin);

        $peakHour = PeakHour::create([
            'tenant_id' => $this->admin->tenant_id,
            'name' => 'Toggle Test',
            'day_of_week' => 3,
            'start_time' => '06:00',
            'end_time' => '08:00',
            'multiplier' => 1.50,
            'is_active' => true,
        ]);

        $response = $this->patchJson("/api/v1/admin/peak-hours/{$peakHour->id}/toggle");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $peakHour->refresh();
        $this->assertFalse($peakHour->is_active);
    }

    public function test_unauthorized_user_cannot_manage_peak_hours(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/admin/peak-hours');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_peak_hours(): void
    {
        $response = $this->getJson('/api/v1/admin/peak-hours');

        $response->assertStatus(401);
    }

    public function test_create_peak_hour_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/peak-hours', []);

        $response->assertStatus(422);
    }

    public function test_create_peak_hour_validates_day_of_week_range(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/peak-hours', [
            'name' => 'Invalid Day',
            'day_of_week' => 7,
            'start_time' => '07:00',
            'end_time' => '09:00',
            'multiplier' => 1.50,
        ]);

        $response->assertStatus(422);
    }

    public function test_create_peak_hour_validates_multiplier_range(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/admin/peak-hours', [
            'name' => 'Invalid Multiplier',
            'day_of_week' => 1,
            'start_time' => '07:00',
            'end_time' => '09:00',
            'multiplier' => 3.00,
        ]);

        $response->assertStatus(422);
    }
}
