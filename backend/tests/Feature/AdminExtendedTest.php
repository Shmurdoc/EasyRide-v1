<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Ride;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminExtendedTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'rider', 'guard_name' => 'web']);
        Role::create(['name' => 'driver', 'guard_name' => 'web']);
        Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $this->tenant = Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant', 'domain' => 'test.local']);
    }

    private function adminUser(): User
    {
        $admin = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $admin->assignRole('admin');
        return $admin;
    }

    // ─── Dashboard ─────────────────────────────────────────────────────

    public function test_admin_dashboard_returns_stats(): void
    {
        Sanctum::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_users',
                'total_drivers',
                'total_rides',
                'total_revenue',
            ]);
    }

    public function test_admin_dashboard_revenue_by_period(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/dashboard/revenue/day')->assertStatus(200);
        $this->getJson('/api/v1/admin/dashboard/revenue/week')->assertStatus(200);
        $this->getJson('/api/v1/admin/dashboard/revenue/month')->assertStatus(200);
    }

    public function test_admin_dashboard_rides_by_period(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/dashboard/rides/day')->assertStatus(200);
        $this->getJson('/api/v1/admin/dashboard/rides/week')->assertStatus(200);
        $this->getJson('/api/v1/admin/dashboard/rides/month')->assertStatus(200);
    }

    // ─── User Management ─────────────────────────────────────────────

    public function test_admin_can_list_manage_users(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        User::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/v1/admin/manage/users');

        $response->assertStatus(200);
    }

    public function test_admin_can_show_user(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $user = User::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson("/api/v1/admin/manage/users/{$user->id}");

        $response->assertStatus(200);
    }

    public function test_admin_can_update_user(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $user = User::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->putJson("/api/v1/admin/manage/users/{$user->id}", [
            'name' => 'Updated by Admin',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated by Admin']);
    }

    public function test_admin_can_suspend_user(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $user = User::factory()->create(['tenant_id' => $this->tenant->id, 'is_active' => true]);

        $response = $this->postJson("/api/v1/admin/manage/users/{$user->id}/suspend", [
            'reason' => 'Violating terms of service',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_active' => false]);
    }

    public function test_admin_can_activate_user(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $user = User::factory()->create(['tenant_id' => $this->tenant->id, 'is_active' => false]);

        $response = $this->postJson("/api/v1/admin/manage/users/{$user->id}/activate");

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_active' => true]);
    }

    // ─── Driver Management ───────────────────────────────────────────

    public function test_admin_can_list_all_drivers(): void
    {
        Sanctum::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/admin/drivers');

        $response->assertStatus(200);
    }

    public function test_admin_can_list_manage_drivers(): void
    {
        Sanctum::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/admin/manage/drivers');

        $response->assertStatus(200);
    }

    public function test_admin_can_show_driver(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');

        $response = $this->getJson("/api/v1/admin/manage/drivers/{$driver->id}");

        $response->assertStatus(200);
    }

    public function test_admin_can_approve_driver(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id, 'is_approved' => false]);
        $driver->assignRole('driver');
        $driver->driverProfile()->create(['user_id' => $driver->id]);

        $response = $this->postJson("/api/v1/admin/manage/drivers/{$driver->id}/approve");

        $response->assertStatus(200);
    }

    public function test_admin_can_reject_driver(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');

        $response = $this->postJson("/api/v1/admin/manage/drivers/{$driver->id}/reject", [
            'reason' => 'Incomplete documentation',
        ]);

        $response->assertStatus(200);
    }

    public function test_admin_can_suspend_driver(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);
        $driver = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $driver->assignRole('driver');

        $response = $this->postJson("/api/v1/admin/manage/drivers/{$driver->id}/suspend", [
            'reason' => 'Safety violation',
        ]);

        $response->assertStatus(200);
    }

    // ─── Ride Management ─────────────────────────────────────────────

    public function test_admin_can_list_all_rides(): void
    {
        Sanctum::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/admin/rides');
        $response->assertStatus(200);
    }

    public function test_admin_can_list_manage_rides(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/manage/rides');
        $response->assertStatus(200);
    }

    // ─── Payment Management ──────────────────────────────────────────

    public function test_admin_can_list_payments(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);

        $rider = User::factory()->create();
        Payment::create([
            'payer_id' => $rider->id,
            'amount' => 100.00,
            'method' => 'cash',
            'status' => 'completed',
            'category' => 'ride',
        ]);

        $response = $this->getJson('/api/v1/admin/manage/payments');
        $response->assertStatus(200);
    }

    public function test_admin_can_get_payment_reconciliation(): void
    {
        $admin = $this->adminUser();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/manage/payments/reconciliation');
        $response->assertStatus(200);
    }

    // ─── Reporting ───────────────────────────────────────────────────

    public function test_admin_can_access_reports(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/reports/dashboard')->assertStatus(200);
        $this->getJson('/api/v1/admin/reports/revenue')->assertStatus(200);
        $this->getJson('/api/v1/admin/reports/drivers')->assertStatus(200);
        $this->getJson('/api/v1/admin/reports/rides')->assertStatus(200);
    }

    // ─── Settings ────────────────────────────────────────────────────

    public function test_admin_can_view_settings(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/settings')->assertStatus(200);
    }

    public function test_admin_can_update_settings(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->postJson('/api/v1/admin/settings', [
            'key' => 'platform_name',
            'value' => 'EasyRyde Test',
        ])->assertStatus(200);
    }

    // ─── Payouts ─────────────────────────────────────────────────────

    public function test_admin_can_view_payouts(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/payouts')->assertStatus(200);
        $this->getJson('/api/v1/admin/payouts/summary')->assertStatus(200);
    }

    // ─── Audit Logs ──────────────────────────────────────────────────

    public function test_admin_can_view_audit_logs(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/audit-logs')->assertStatus(200);
    }

    // ─── Live Map ────────────────────────────────────────────────────

    public function test_admin_can_view_live_map(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->getJson('/api/v1/admin/live-map/drivers')->assertStatus(200);
    }

    // ─── Admin Stats ─────────────────────────────────────────────────

    public function test_admin_can_view_stats(): void
    {
        Sanctum::actingAs($this->adminUser());

        $response = $this->getJson('/api/v1/admin/stats');
        $response->assertStatus(200)
            ->assertJsonStructure(['total_users', 'total_riders', 'total_drivers', 'active_drivers']);
    }

    // ─── Access Control ──────────────────────────────────────────────

    public function test_rider_cannot_access_admin(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');
        Sanctum::actingAs($rider);

        $this->getJson('/api/v1/admin/dashboard')->assertStatus(403);
        $this->getJson('/api/v1/admin/users')->assertStatus(403);
        $this->getJson('/api/v1/admin/rides')->assertStatus(403);
    }

    public function test_driver_cannot_access_admin(): void
    {
        $driver = User::factory()->create();
        $driver->assignRole('driver');
        Sanctum::actingAs($driver);

        $this->getJson('/api/v1/admin/dashboard')->assertStatus(403);
    }

    public function test_unauthenticated_cannot_access_admin(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);
        $this->getJson('/api/v1/admin/users')->assertStatus(401);
    }
}
