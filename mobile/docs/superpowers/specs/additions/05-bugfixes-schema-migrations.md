# Bug Fixes & Schema Migrations — EasyRyde

## Executive Summary

This plan addresses 8 critical bugs found in the enterprise audit and defines 9 new database migrations required for the surge pricing, ride pooling, and platform enhancement features. All migrations are additive (no breaking changes to existing schema), fully reversible, and designed for zero-downtime deployment. Estimated effort: 48 hours.

## Critical Bug Fixes

### BUG-001: Missing xl Category in FareCalculationService
- **File:** `F:\EasyRyde\backend\app\Services\FareCalculationService.php`
- **Line:** CATEGORY_RATES array (line 12-18)
- **Issue:** The `CATEGORY_RATES` array contains keys for `standard`, `xl`, and `van`. However, the `xl` key is missing from the array definition. When a rider requests an XL vehicle, the service falls back to `standard` rates silently, charging R10 base + R5/km instead of the correct R25 base + R12/km. This means XL rides are undercharged by approximately 60%.
- **Fix:** Add the missing `xl` key to CATEGORY_RATES:
  ```php
  private const CATEGORY_RATES = [
      'standard' => ['base' => 10, 'per_km' => 5, 'per_min' => 1.0, 'minimum' => 15],
      'xl' => ['base' => 25, 'per_km' => 12, 'per_min' => 2.5, 'minimum' => 35],
      'van' => ['base' => 30, 'per_km' => 15, 'per_min' => 3.0, 'minimum' => 45],
  ];
  ```
- **Testing:** Create XL ride request, verify fare uses R25 base + R12/km. Compare with standard ride to confirm different rates. Run existing fare calculation tests to ensure no regression.
- **Rollback:** Remove `xl` key from array. No database changes.

### BUG-002: Missing is_system Column on ride_chat_messages
- **File:** `F:\EasyRyde\backend\database\migrations\2024_06_01_000000_create_ride_chat_messages_table.php`
- **Issue:** The `RideChatMessage` model has `is_system` in its `$fillable` array (line 15), but the migration that creates the table does not include this column. When system messages are sent (e.g., "Driver has arrived"), the `is_system` attribute is silently dropped, and the message is stored as a regular user message.
- **Fix:** Create new migration:
  ```php
  Schema::table('ride_chat_messages', function (Blueprint $table) {
      $table->boolean('is_system')->default(false)->after('message');
  });
  ```
- **Testing:** Send a system message, verify `is_system = true` in database. Send a regular message, verify `is_system = false`. Check that chat UI correctly filters/displays system messages differently.
- **Rollback:** `$table->dropColumn('is_system');`

### BUG-003: Stale Driver Location Cache Keys
- **File:** `F:\EasyRyde\backend\app\Services\DriverLocationService.php`
- **Line:** updateLocation method (line 28-35)
- **Issue:** The service stores driver locations in Redis with key `driver:location:{driver_id}` but never sets an expiry. Over time, Redis accumulates locations for drivers who have gone offline or deregistered. The cleanup job `CleanupStaleLocationsJob` was never implemented (see 04-scheduled-jobs-automation.md). This causes: (1) Redis memory bloat, (2) MatchDriversJob considering stale locations, (3) Inaccurate "X drivers nearby" counts.
- **Fix:** (1) Add TTL to Redis set commands: `$redis->setex("driver:location:{$driverId}", 86400, json_encode($location));` (2) Create CleanupStaleLocationsJob (see job spec in 04-scheduled-jobs-automation.md). (3) Update MatchDriversJob to only consider locations updated within last 5 minutes.
- **Testing:** Set driver location, verify TTL exists. Wait or mock time, verify key expires. Check that MatchDriversJob ignores expired locations.
- **Rollback:** Remove TTL from Redis set command. No database changes.

### BUG-004: Race Condition in Ride Acceptance
- **File:** `F:\EasyRyde\backend\app\Services\RideService.php`
- **Line:** acceptRide method (line 89-112)
- **Issue:** When two drivers accept the same ride simultaneously, both transactions succeed due to missing pessimistic locking. The ride ends up assigned to both drivers, causing double pickup attempts and fare disputes.
- **Fix:** Add database lock before acceptance:
  ```php
  DB::beginTransaction();
  $ride = Ride::where('id', $rideId)
      ->where('status', 'searching')
      ->lockForUpdate()
      ->first();
  
  if (!$ride) {
      DB::rollBack();
      throw new RideAlreadyAcceptedException();
  }
  
  $ride->update(['driver_id' => $driverId, 'status' => 'accepted']);
  DB::commit();
  ```
- **Testing:** Simulate concurrent accept requests using parallel HTTP calls. Verify only one succeeds. Verify the other returns 409 Conflict. Check ride has single driver assigned.
- **Rollback:** Remove lockForUpdate(). No database changes.

### BUG-005: Incorrect Surge Multiplier Calculation
- **File:** `F:\EasyRyde\backend\app\Services\SurgePricingService.php`
- **Line:** calculateSurge method (line 45-62)
- **Issue:** The surge calculation divides pending_rides by active_drivers but does not handle the case where active_drivers is 0. Division by zero causes the multiplier to be `Infinity`, which when cast to decimal becomes `999999.99`. This multiplies all fares by an absurd amount.
- **Fix:** Add zero-driver check:
  ```php
  $activeDrivers = max($activeDrivers, 1); // Ensure at least 1 to prevent division by zero
  $ratio = $pendingRides / $activeDrivers;
  ```
  Also add a hard cap: `$multiplier = min($multiplier, config('surge.max_multiplier', 3.0));`
- **Testing:** Set active_drivers to 0 with pending rides, verify multiplier is 3.0 (max cap) not Infinity. Test with normal values to ensure no regression. Verify multiplier never exceeds 3.0.
- **Rollback:** Remove zero check. No database changes.

### BUG-006: Payment Escrow Never Released for Completed Cash Rides
- **File:** `F:\EasyRyde\backend\app\Jobs\ReleaseEscrowJob.php`
- **Line:** release method (line 32-48)
- **Issue:** The job only releases escrow for payments with `method = 'card'`. Cash payments are marked as `status = 'completed'` immediately but the driver's pending_balance is never credited. Cash-ride drivers never get paid through the system.
- **Fix:** Update the query to include cash payments:
  ```php
  $payments = Payment::whereIn('status', ['held', 'completed'])
      ->where('method', 'card')
      ->orWhere(function ($q) {
          $q->where('method', 'cash')
            ->where('status', 'completed')
            ->where('held_until', '<', now());
      })
      ->get();
  ```
  Or better: process cash payments separately with their own release logic.
- **Testing:** Complete a cash ride, verify driver pending_balance is credited. Complete a card ride, verify escrow is released. Check that both payment types appear in DriverEarning records.
- **Rollback:** Revert ReleaseEscrowJob.php. No database changes.

### BUG-007: Missing Index on rides(status, created_at)
- **File:** `F:\EasyRyde\backend\database\migrations\2024_01_01_000000_create_rides_table.php`
- **Issue:** The rides table has an index on `status` alone and `created_at` alone, but no composite index. Queries that filter by both (e.g., "find all searching rides created in last 15 minutes" for ExpireStaleRidesJob) perform full table scans. With 10,000+ rides, this query takes 2-3 seconds.
- **Fix:** Create new migration:
  ```php
  Schema::table('rides', function (Blueprint $table) {
      $table->index(['status', 'created_at'], 'rides_status_created_index');
  });
  ```
- **Testing:** Run EXPLAIN on ExpireStaleRidesJob query before and after. Verify index is used (type: ref or range). Measure query time improvement.
- **Rollback:** `$table->dropIndex('rides_status_created_index');`

### BUG-008: Socket Not Broadcasting Driver Location Updates
- **File:** `F:\EasyRyde\backend\app\Events\DriverLocationUpdated.php`
- **Line:** broadcastOn method (line 18-22)
- **Issue:** The event broadcasts to `private` channel `driver.location.{driverId}` but the mobile app subscribes to `presence` channel `ride.{rideId}.drivers`. The rider never receives real-time driver location updates on the map.
- **Fix:** Update broadcastOn to broadcast to the correct channel:
  ```php
  public function broadcastOn(): array
  {
      return [
          new PresenceChannel('ride.' . $this->rideId . '.drivers'),
      ];
  }
  ```
  Also update the broadcastWith to include ride_id:
  ```php
  public function broadcastWith(): array
  {
      return [
          'driver_id' => $this->driverId,
          'ride_id' => $this->rideId,
          'lat' => $this->lat,
          'lng' => $this->lng,
          'updated_at' => $this->updatedAt,
      ];
  }
  ```
- **Testing:** Start a ride, verify rider receives driver location updates on map. Check that location updates are received every 5 seconds. Verify channel subscription in Pusher/WebSocket logs.
- **Rollback:** Revert DriverLocationUpdated.php. No database changes.

## Schema Migrations

### Migration 1: create_peak_hours_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peak_hours', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->unsignedTinyInteger('day_of_week'); // 0=Sunday, 6=Saturday
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('multiplier', 3, 2)->default(1.00);
            $table->boolean('is_recurring')->default(true);
            $table->timestamp('effective_from')->nullable();
            $table->timestamp('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('name')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->index(['tenant_id', 'day_of_week', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peak_hours');
    }
};
```

### Migration 2: create_surge_zones_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surge_zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->polygon('boundary')->spatial();
            $table->decimal('multiplier', 3, 2)->default(1.00);
            $table->unsignedInteger('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->decimal('center_lat', 10, 7)->nullable();
            $table->decimal('center_lng', 10, 7)->nullable();
            $table->decimal('radius_km', 6, 2)->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surge_zones');
    }
};
```

### Migration 3: create_surge_history_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surge_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('zone_id')->nullable()->index();
            $table->decimal('multiplier', 3, 2);
            $table->unsignedInteger('active_drivers')->default(0);
            $table->unsignedInteger('pending_rides')->default(0);
            $table->decimal('demand_supply_ratio', 5, 2);
            $table->string('trigger_type');
            $table->string('peak_hour_id')->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('zone_id')->references('id')->on('surge_zones')->nullable();
            $table->index(['tenant_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surge_history');
    }
};
```

### Migration 4: create_surge_overrides_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surge_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('zone_id')->nullable()->index();
            $table->decimal('multiplier', 3, 2);
            $table->string('reason')->nullable();
            $table->uuid('admin_id')->index();
            $table->timestamp('expires_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('zone_id')->references('id')->on('surge_zones')->nullable();
            $table->foreign('admin_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surge_overrides');
    }
};
```

### Migration 5: create_pool_groups_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('driver_id')->nullable()->index();
            $table->enum('status', ['matching', 'matched', 'in_progress', 'completed', 'cancelled'])->default('matching');
            $table->unsignedTinyInteger('max_passengers')->default(4);
            $table->unsignedTinyInteger('current_passengers')->default(0);
            $table->text('route_polyline')->nullable();
            $table->decimal('total_distance_km', 8, 2)->nullable();
            $table->unsignedInteger('estimated_duration_minutes')->nullable();
            $table->decimal('base_fare', 10, 2)->default(0);
            $table->decimal('total_savings', 10, 2)->default(0);
            $table->timestamp('matching_started_at');
            $table->timestamp('matched_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('driver_id')->references('id')->on('drivers')->nullable();
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'driver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_groups');
    }
};
```

### Migration 6: create_pool_rides_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_rides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('pool_group_id')->index();
            $table->uuid('ride_id')->unique();
            $table->uuid('rider_id')->index();
            $table->unsignedTinyInteger('pickup_order')->nullable();
            $table->unsignedTinyInteger('dropoff_order')->nullable();
            $table->decimal('pickup_lat', 10, 7);
            $table->decimal('pickup_lng', 10, 7);
            $table->decimal('dropoff_lat', 10, 7);
            $table->decimal('dropoff_lng', 10, 7);
            $table->decimal('route_deviation_meters', 8, 2)->default(0);
            $table->decimal('rider_share', 10, 2);
            $table->decimal('solo_fare', 10, 2);
            $table->decimal('discount_percentage', 5, 2);
            $table->enum('status', ['pending', 'confirmed', 'picked_up', 'dropped_off', 'cancelled'])->default('pending');
            $table->boolean('flexible_timing')->default(false);
            $table->unsignedInteger('flexibility_minutes')->default(0);
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('pool_group_id')->references('id')->on('pool_groups');
            $table->foreign('ride_id')->references('id')->on('rides');
            $table->foreign('rider_id')->references('id')->on('users');
            $table->index(['pool_group_id', 'status']);
            $table->index(['rider_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_rides');
    }
};
```

### Migration 7: create_pool_match_requests_table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_match_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('ride_id')->unique();
            $table->uuid('rider_id')->index();
            $table->decimal('pickup_lat', 10, 7);
            $table->decimal('pickup_lng', 10, 7);
            $table->decimal('dropoff_lat', 10, 7);
            $table->decimal('dropoff_lng', 10, 7);
            $table->text('route_polyline_encoded');
            $table->decimal('max_deviation_meters', 8, 2)->default(500);
            $table->unsignedInteger('max_wait_minutes')->default(10);
            $table->boolean('flexible_timing')->default(false);
            $table->unsignedInteger('flexibility_minutes')->default(0);
            $table->enum('status', ['waiting', 'matched', 'expired', 'cancelled'])->default('waiting');
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('ride_id')->references('id')->on('rides');
            $table->foreign('rider_id')->references('id')->on('users');
            $table->index(['tenant_id', 'status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_match_requests');
    }
};
```

### Migration 8: add_is_system_to_ride_chat_messages

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_chat_messages', function (Blueprint $table) {
            $table->boolean('is_system')->default(false)->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('ride_chat_messages', function (Blueprint $table) {
            $table->dropColumn('is_system');
        });
    }
};
```

### Migration 9: add_composite_index_to_rides

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'rides_status_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropIndex('rides_status_created_index');
        });
    }
};
```

## Migration Execution Plan

| # | Migration | Order | Downtime | Rollback | Risk |
|---|-----------|-------|----------|----------|------|
| 1 | add_is_system_to_ride_chat_messages | 1 | None | DROP COLUMN | Low |
| 2 | add_composite_index_to_rides | 2 | None | DROP INDEX | Low |
| 3 | create_peak_hours_table | 3 | None | DROP TABLE | Low |
| 4 | create_surge_zones_table | 4 | None | DROP TABLE | Low |
| 5 | create_surge_history_table | 5 | None | DROP TABLE | Low |
| 6 | create_surge_overrides_table | 6 | None | DROP TABLE | Low |
| 7 | create_pool_groups_table | 7 | None | DROP TABLE | Low |
| 8 | create_pool_rides_table | 8 | None | DROP TABLE | Low |
| 9 | create_pool_match_requests_table | 9 | None | DROP TABLE | Low |

### Execution Order Rationale

1. **BUG-002 fix first** (Migration 8) — fixes existing functionality, no dependencies
2. **Performance index second** (Migration 9) — immediate query improvement, no dependencies
3. **Peak hours third** (Migration 1) — simple table, no foreign keys to new tables
4. **Surge tables fourth** (Migrations 2-4) — peak_hours must exist for surge_overrides foreign key
5. **Pool tables fifth** (Migrations 5-7) — depends on existing rides and users tables

### Zero-Downtime Strategy

- All new columns have defaults (no NOT NULL without defaults)
- All new tables are additive (no changes to existing table structure except two safe additions)
- All indexes are created non-concurrently (PostgreSQL) or with default algorithm (MySQL)
- No foreign key constraints reference tables that might not exist
- Mobile apps can safely ignore new fields (backward compatible)

## Backward Compatibility

| Change | Impact | Mitigation |
|--------|--------|------------|
| `is_system` column on ride_chat_messages | New column with default | Apps ignore unknown fields |
| Composite index on rides | No API change | Pure performance improvement |
| peak_hours table | No API change | New table, no existing references |
| surge_zones table | No API change | New table, no existing references |
| surge_history table | No API change | New table, no existing references |
| surge_overrides table | No API change | New table, no existing references |
| pool_groups table | No API change | New table, no existing references |
| pool_rides table | No API change | New table, no existing references |
| pool_match_requests table | No API change | New table, no existing references |

All API endpoints are additive (new endpoints only, no existing endpoints modified or removed). Mobile apps on older versions will not break — they simply won't have pool or surge features until updated.

## Implementation Tasks

| # | Task | Owner | Estimate | Dependencies | Priority |
|---|------|-------|----------|--------------|----------|
| 1 | Fix BUG-001: Add xl category to FareCalculationService | Backend Dev | 1h | None | P0 |
| 2 | Fix BUG-002: Create migration for is_system column | Backend Dev | 1h | None | P0 |
| 3 | Fix BUG-003: Add TTL to Redis location keys | Backend Dev | 2h | None | P0 |
| 4 | Fix BUG-004: Add pessimistic locking to ride acceptance | Backend Dev | 3h | None | P0 |
| 5 | Fix BUG-005: Fix division by zero in surge calculation | Backend Dev | 1h | None | P0 |
| 6 | Fix BUG-006: Include cash payments in escrow release | Backend Dev | 2h | None | P0 |
| 7 | Fix BUG-007: Create composite index migration | Backend Dev | 1h | None | P0 |
| 8 | Fix BUG-008: Fix Socket channel in DriverLocationUpdated | Backend Dev | 2h | None | P0 |
| 9 | Create Migration 1: peak_hours table | Backend Dev | 1h | None | P0 |
| 10 | Create Migration 2: surge_zones table | Backend Dev | 2h | PostGIS enabled | P0 |
| 11 | Create Migration 3: surge_history table | Backend Dev | 1h | Migration 2 | P0 |
| 12 | Create Migration 4: surge_overrides table | Backend Dev | 1h | Migration 2 | P0 |
| 13 | Create Migration 5: pool_groups table | Backend Dev | 2h | None | P1 |
| 14 | Create Migration 6: pool_rides table | Backend Dev | 2h | Migration 5 | P1 |
| 15 | Create Migration 7: pool_match_requests table | Backend Dev | 2h | None | P1 |
| 16 | Create Migration 8: is_system column | Backend Dev | 1h | None | P0 |
| 17 | Create Migration 9: composite index | Backend Dev | 1h | None | P0 |
| 18 | Run all migrations on development database | Backend Dev | 1h | Migrations 1-9 | P0 |
| 19 | Write test cases for all 8 bug fixes | QA Engineer | 6h | Fixes 1-8 | P1 |
| 20 | Verify all migrations are reversible | QA Engineer | 2h | Migrations 1-9 | P1 |
| 21 | Load test with new indexes | QA Engineer | 2h | Migration 9 | P2 |

**Total Estimated Effort: 37 hours**

## Acceptance Criteria

- [ ] All 8 bug fixes verified with test cases passing
- [ ] All 9 migrations run cleanly on fresh database
- [ ] All migrations are reversible (up and down execute without errors)
- [ ] No breaking changes to existing API endpoints
- [ ] All new tables have proper indexes for expected query patterns
- [ ] All foreign keys have proper constraints and ON DELETE behavior
- [ ] Composite index on rides(status, created_at) reduces query time by >50%
- [ ] XL fare calculation uses correct rates (R25 base + R12/km)
- [ ] System messages persist with is_system = true
- [ ] Ride acceptance race condition resolved (only one driver accepted)
- [ ] Surge multiplier never exceeds 3.0x (even with 0 drivers)
- [ ] Cash ride payments correctly credit driver pending_balance
- [ ] Socket broadcasts driver location to correct ride channel
- [ ] Redis driver location keys expire after 24 hours
- [ ] All migrations completed within 5 minutes on production-like database
- [ ] Zero downtime during migration execution
