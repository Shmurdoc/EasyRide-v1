<?php

namespace Tests\Feature;

use App\Models\IncidentReport;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class IncidentExtendedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
    }

    // ─── Report ──────────────────────────────────────────────────────────

    public function test_report_incident_with_ride_id(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $ride = Ride::create([
            'rider_id' => $rider->id,
            'status' => 'completed',
            'category' => 'standard',
            'pickup_latitude' => -23.9468,
            'pickup_longitude' => 29.4726,
            'pickup_address' => '123 Main St',
            'dropoff_latitude' => -23.9500,
            'dropoff_longitude' => 29.4800,
            'dropoff_address' => '456 Oak Ave',
            'total_fare' => 150.00,
        ]);

        $response = $this->postJson('/api/v1/incidents', [
            'incident_type' => 'safety_concern',
            'severity' => 'high',
            'title' => 'Dangerous driving',
            'description' => 'Driver was speeding excessively.',
            'ride_id' => $ride->id,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['message', 'incident']);
    }

    public function test_report_incident_requires_title(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/incidents', [
            'incident_type' => 'other',
            'severity' => 'low',
            'description' => 'Something happened.',
        ]);

        $response->assertStatus(422);
    }

    public function test_report_incident_requires_severity(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->postJson('/api/v1/incidents', [
            'incident_type' => 'other',
            'title' => 'Missing severity',
            'description' => 'Test.',
        ]);

        $response->assertStatus(422);
    }

    // ─── List (user) ─────────────────────────────────────────────────────

    public function test_user_incidents_only_show_their_own(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        IncidentReport::create([
            'reporter_id' => $rider1->id,
            'incident_type' => 'safety_concern',
            'severity' => 'medium',
            'title' => 'Rider 1 incident',
            'description' => 'Description',
            'status' => 'open',
        ]);

        IncidentReport::create([
            'reporter_id' => $rider2->id,
            'incident_type' => 'other',
            'severity' => 'low',
            'title' => 'Rider 2 incident',
            'description' => 'Description',
            'status' => 'open',
        ]);

        Sanctum::actingAs($rider1);
        $response = $this->getJson('/api/v1/incidents/my');

        $response->assertOk();
        $incidents = $response->json('incidents');
        $this->assertCount(1, $incidents);
    }

    // ─── Detail ──────────────────────────────────────────────────────────

    public function test_user_cannot_view_other_users_incident(): void
    {
        $rider1 = User::factory()->create();
        $rider1->assignRole('rider');
        $rider2 = User::factory()->create();
        $rider2->assignRole('rider');

        $incident = IncidentReport::create([
            'reporter_id' => $rider1->id,
            'incident_type' => 'safety_concern',
            'severity' => 'medium',
            'title' => 'Private incident',
            'description' => 'Description',
            'status' => 'open',
        ]);

        Sanctum::actingAs($rider2);
        $response = $this->getJson("/api/v1/incidents/{$incident->id}");

        $response->assertStatus(403);
    }

    public function test_admin_can_view_any_incident(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $incident = IncidentReport::create([
            'reporter_id' => $rider->id,
            'incident_type' => 'safety_concern',
            'severity' => 'medium',
            'title' => 'Any incident',
            'description' => 'Description',
            'status' => 'open',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/v1/incidents/{$incident->id}");

        $response->assertOk()
            ->assertJsonPath('incident.id', $incident->id);
    }

    // ─── Admin assign ────────────────────────────────────────────────────

    public function test_admin_can_assign_incident(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $rider = User::factory()->create();
        $incident = IncidentReport::create([
            'reporter_id' => $rider->id,
            'incident_type' => 'safety_concern',
            'severity' => 'medium',
            'title' => 'To assign',
            'description' => 'Description',
            'status' => 'open',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/compliance/incidents/{$incident->id}/assign", [
            'assigned_to' => $admin->id,
        ]);

        $response->assertOk();
    }

    public function test_non_admin_cannot_assign_incident(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $incident = IncidentReport::create([
            'reporter_id' => $rider->id,
            'incident_type' => 'other',
            'severity' => 'low',
            'title' => 'Test',
            'description' => 'Description',
            'status' => 'open',
        ]);

        Sanctum::actingAs($rider);
        $response = $this->postJson("/api/v1/admin/compliance/incidents/{$incident->id}/assign", [
            'assigned_to' => $rider->id,
        ]);

        $response->assertStatus(403);
    }

    // ─── Admin escalate ──────────────────────────────────────────────────

    public function test_admin_can_escalate_incident(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $rider = User::factory()->create();
        $incident = IncidentReport::create([
            'reporter_id' => $rider->id,
            'incident_type' => 'safety_concern',
            'severity' => 'medium',
            'title' => 'To escalate',
            'description' => 'Description',
            'status' => 'investigating',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/compliance/incidents/{$incident->id}/escalate");

        $response->assertOk();
    }

    // ─── Stats ───────────────────────────────────────────────────────────

    public function test_incident_stats_returns_counts(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/compliance/incidents/stats');

        $response->assertOk()
            ->assertJsonStructure(['stats']);
    }

    public function test_non_admin_cannot_view_incident_stats(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/v1/admin/compliance/incidents/stats');

        $response->assertStatus(403);
    }
}
