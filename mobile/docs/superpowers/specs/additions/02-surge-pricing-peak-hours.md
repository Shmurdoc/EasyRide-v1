# Surge Pricing & Peak Hours System — EasyRyde

## Executive Summary

EasyRyde currently has a `SurgePricingService` that calculates surge multipliers but never applies them to ride fares. The system has hardcoded Phalaborwa zones (CBD, Airport, Township) with no admin configuration. This plan implements a complete surge pricing and peak hours system with admin management UI, real-time demand/supply calculation, rider notifications, and audit logging. Estimated effort: 88 hours.

## Current State Analysis

### What Exists
- `SurgePricingService` (`F:\EasyRyde\backend\app\Services\SurgePricingService.php`) — calculates multiplier based on active drivers vs pending rides per zone
- `SystemSetting` model stores surge configuration (min drivers, max surge, decay rate)
- Hardcoded zones in service: CBD (lat: -23.8967, lng: 31.8853), Airport (lat: -23.9325, lng: 31.1414), Township (lat: -23.9012, lng: 31.8756)
- `Ride` model has `surge_multiplier` column (default 1.0) but it is never updated
- `FareCalculationService` multiplies base fare by `surge_multiplier` but it is always 1.0

### What's Missing
- Peak hours configuration (schedule-based and real-time)
- Real-time demand/supply calculation per zone
- Surge application to ride fare estimates and final fares
- Admin UI for surge zone management and peak hour scheduling
- Rider notification of surge multiplier before booking
- Driver incentives during peak hours
- Surge history for audit and analytics

## Data Model Design

### Peak Hours Table

```php
Schema::create('peak_hours', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->unsignedTinyInteger('day_of_week'); // 0=Sunday, 6=Saturday
    $table->time('start_time');
    $table->time('end_time');
    $table->decimal('multiplier', 3, 2)->default(1.00); // 1.00 to 3.00
    $table->boolean('is_recurring')->default(true);
    $table->timestamp('effective_from')->nullable();
    $table->timestamp('effective_to')->nullable();
    $table->boolean('is_active')->default(true);
    $table->string('name')->nullable(); // e.g., "Morning Rush", "Friday Evening"
    $table->timestamps();
    $table->foreign('tenant_id')->references('id')->on('tenants');
    $table->index(['tenant_id', 'day_of_week', 'is_active']);
});
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes | tenants.id |
| day_of_week | unsignedTinyInteger | yes | — | yes (composite) | — |
| start_time | time | yes | — | no | — |
| end_time | time | yes | — | no | — |
| multiplier | decimal(3,2) | yes | 1.00 | no | — |
| is_recurring | boolean | yes | true | no | — |
| effective_from | timestamp | no | null | no | — |
| effective_to | timestamp | no | null | no | — |
| is_active | boolean | yes | true | yes (composite) | — |
| name | string | no | null | no | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

### Surge Zones Table

```php
Schema::create('surge_zones', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->string('name'); // e.g., "Phalaborwa CBD"
    $table->polygon('boundary')->spatial(); // PostGIS polygon
    $table->decimal('multiplier', 3, 2)->default(1.00);
    $table->unsignedInteger('priority')->default(0); // Higher = checked first
    $table->boolean('is_active')->default(true);
    $table->decimal('center_lat', 10, 7)->nullable();
    $table->decimal('center_lng', 10, 7)->nullable();
    $table->decimal('radius_km', 6, 2)->nullable(); // For circular zones
    $table->timestamps();
    $table->foreign('tenant_id')->references('id')->on('tenants');
    $table->index(['tenant_id', 'is_active']);
});
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes | tenants.id |
| name | string | yes | — | no | — |
| boundary | polygon | yes | — | spatial | — |
| multiplier | decimal(3,2) | yes | 1.00 | no | — |
| priority | unsignedInteger | yes | 0 | no | — |
| is_active | boolean | yes | true | yes (composite) | — |
| center_lat | decimal(10,7) | no | null | no | — |
| center_lng | decimal(10,7) | no | null | no | — |
| radius_km | decimal(6,2) | no | null | no | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

### Surge History Table

```php
Schema::create('surge_history', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->uuid('zone_id')->nullable()->index();
    $table->decimal('multiplier', 3, 2);
    $table->unsignedInteger('active_drivers')->default(0);
    $table->unsignedInteger('pending_rides')->default(0);
    $table->decimal('demand_supply_ratio', 5, 2);
    $table->string('trigger_type'); // 'scheduled', 'real-time', 'manual'
    $table->string('peak_hour_id')->nullable();
    $table->timestamp('recorded_at');
    $table->timestamps();
    $table->foreign('tenant_id')->references('id')->on('tenants');
    $table->foreign('zone_id')->references('id')->on('surge_zones')->nullable();
    $table->index(['tenant_id', 'recorded_at']);
});
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes | tenants.id |
| zone_id | uuid | no | null | yes | surge_zones.id |
| multiplier | decimal(3,2) | yes | — | no | — |
| active_drivers | unsignedInteger | yes | 0 | no | — |
| pending_rides | unsignedInteger | yes | 0 | no | — |
| demand_supply_ratio | decimal(5,2) | yes | — | no | — |
| trigger_type | string | yes | — | no | — |
| peak_hour_id | string | no | null | no | — |
| recorded_at | timestamp | yes | — | yes (composite) | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

### Surge Overrides Table (Admin Manual Override)

```php
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
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes | tenants.id |
| zone_id | uuid | no | null | yes | surge_zones.id |
| multiplier | decimal(3,2) | yes | — | no | — |
| reason | string | no | null | no | — |
| admin_id | uuid | yes | — | yes | users.id |
| expires_at | timestamp | yes | — | no | — |
| is_active | boolean | yes | true | no | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

## API Design

### Admin Endpoints

**GET /v1/admin/surge/zones**
- List all surge zones with current multipliers
- Query params: `is_active`, `page`, `per_page`
- Response: `{ data: [{ id, name, multiplier, priority, is_active, center_lat, center_lng, radius_km }], meta: { current_drivers, pending_rides } }`

**POST /v1/admin/surge/zones**
- Create a new surge zone
- Body: `{ name, boundary: [[lng, lat], ...], multiplier, priority, center_lat, center_lng, radius_km }`
- Validation: `name: required|string|max:100`, `boundary: required|array|min:3`, `multiplier: required|numeric|between:1.00,3.00`
- Response: `{ data: SurgeZone }`

**PUT /v1/admin/surge/zones/{id}**
- Update surge zone
- Body: any subset of create fields
- Response: `{ data: SurgeZone }`

**DELETE /v1/admin/surge/zones/{id}**
- Soft delete (set `is_active = false`)
- Response: `{ message: "Zone deactivated" }`

**GET /v1/admin/peak-hours**
- List all peak hour schedules
- Query params: `day_of_week`, `is_active`, `page`
- Response: `{ data: [PeakHour] }`

**POST /v1/admin/peak-hours**
- Create peak hour schedule
- Body: `{ name, day_of_week, start_time, end_time, multiplier, is_recurring, effective_from, effective_to }`
- Validation: `day_of_week: required|integer|between:0,6`, `start_time: required|date_format:H:i`, `end_time: required|date_format:H:i|after:start_time`, `multiplier: required|numeric|between:1.00,3.00`
- Response: `{ data: PeakHour }`

**PUT /v1/admin/peak-hours/{id}**
- Update peak hour schedule
- Body: any subset of create fields
- Response: `{ data: PeakHour }`

**DELETE /v1/admin/peak-hours/{id}**
- Soft delete (set `is_active = false`)
- Response: `{ message: "Peak hour schedule deactivated" }`

**POST /v1/admin/surge/override**
- Manual surge override for a zone
- Body: `{ zone_id, multiplier, reason, expires_at }`
- Validation: `zone_id: required|uuid`, `multiplier: required|numeric|between:1.00,3.00`, `expires_at: required|date|after:now`
- Response: `{ data: SurgeOverride }`

**GET /v1/admin/surge/history**
- View surge history for analytics
- Query params: `zone_id`, `from`, `to`, `page`
- Response: `{ data: [SurgeHistory], meta: { avg_multiplier, peak_multiplier, total_records } }`

### Rider Endpoints (Updated)

**GET /v1/rides/fare-estimate (updated)**
- Include current surge multiplier in response
- Body: `{ pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type }`
- Response: `{ base_fare, distance_fare, time_fare, surge_multiplier, surge_zone, total_fare, note: "Surge pricing active: 1.5x" }`

**POST /v1/rides/request (updated)**
- Apply surge multiplier to ride fare
- System calculates surge before creating ride
- Response includes `surge_multiplier` and `original_fare` for transparency

### Socket Events

- `surge:updated` — broadcast when zone multiplier changes (admin, drivers)
- `surge:active` — rider notified of active surge in their zone before booking
- `peak:started` — driver notified when peak hours begin
- `peak:ended` — driver notified when peak hours end

## Algorithm Design

### Surge Calculation

```
Function calculateSurge(zone_id, timestamp):
    1. Check for active manual override → return override multiplier
    2. Check for active peak hour schedule → base_multiplier = peak.multiplier
    3. Calculate demand_supply_ratio:
       active_drivers = COUNT(Drivers WHERE status='online' AND current_zone=zone_id)
       pending_rides = COUNT(Rides WHERE status='searching' AND pickup_zone=zone_id)
       ratio = pending_rides / MAX(active_drivers, 1)
    4. Calculate surge_multiplier:
       IF ratio < 0.5: multiplier = 1.0 (surplus drivers)
       ELIF ratio < 1.0: multiplier = 1.0 + (ratio * 0.5) (slight demand)
       ELIF ratio < 2.0: multiplier = 1.25 + ((ratio - 1.0) * 0.75) (moderate surge)
       ELIF ratio < 3.0: multiplier = 2.0 + ((ratio - 2.0) * 0.5) (high surge)
       ELSE: multiplier = 2.5 + MIN((ratio - 3.0) * 0.1, 0.5) (capped at 3.0)
    5. Apply peak multiplier if active: final = multiplier * peak.multiplier
    6. Cap at MAX_SURGE (3.0): final = MIN(final, 3.0)
    7. Round to 2 decimal places
    8. Log to surge_history
    9. Return final multiplier
```

### Peak Detection

**Scheduled Peaks:**
- Query `peak_hours` table for current day and time
- Match `day_of_week = DAYOFWEEK(NOW())` AND `start_time <= NOW() AND end_time >= NOW()`
- If `is_recurring = false`, also check `effective_from <= NOW() AND effective_to >= NOW()`
- Take highest multiplier if multiple peaks overlap

**Real-Time Detection (Future Enhancement):**
- Monitor ride request rate per zone over 5-minute sliding window
- If request rate exceeds 2x the 30-day average for that time period, trigger automatic surge
- Log as `trigger_type = 'real-time'` in surge_history

### Zone Containment

```sql
-- Check if point is inside polygon zone
SELECT id, name, multiplier
FROM surge_zones
WHERE is_active = true
  AND ST_Contains(boundary, ST_Point(:lng, :lat))
ORDER BY priority DESC
LIMIT 1;

-- Fallback: check circular zones
SELECT id, name, multiplier
FROM surge_zones
WHERE is_active = true
  AND center_lat IS NOT NULL
  AND ST_Distance(
    ST_Point(:lng, :lat),
    ST_Point(center_lng, center_lat)
  ) <= radius_km * 1000
ORDER BY priority DESC
LIMIT 1;
```

## Admin UI Design

### Surge Zone Management Screen

**Layout:**
- Left panel: Map view showing all zones as colored polygons (green=1.0x, yellow=1.5x, orange=2.0x, red=2.5x+)
- Right panel: Zone list with columns: Name, Multiplier, Priority, Status, Actions
- Top bar: "Create Zone" button, filter by status, search by name

**Create Zone Flow:**
1. Click "Create Zone" → modal opens
2. Enter zone name, priority
3. Draw polygon on map (click to add points, close polygon)
4. OR enter center coordinates and radius for circular zone
5. Set default multiplier (1.0-3.0)
6. Click "Save" → zone created, map updates

**Zone Detail View:**
- Click zone on map or list → detail panel opens
- Shows: name, current multiplier, active drivers in zone, pending rides
- Edit button → inline editing of multiplier, priority
- Deactivate button → soft delete
- History chart showing multiplier over time (last 7 days)

### Peak Hours Scheduling Screen

**Layout:**
- Weekly calendar grid (7 columns for days, 24 rows for hours)
- Existing schedules shown as colored blocks
- Click to create new schedule or edit existing

**Create Schedule Flow:**
1. Click empty time slot on calendar → modal opens
2. Enter schedule name (e.g., "Morning Rush")
3. Select day(s) of week (multi-select)
4. Set start time and end time
5. Set multiplier (1.0-3.0)
6. Toggle "Recurring" on/off
7. If not recurring, set effective date range
8. Click "Save" → calendar updates

**Override Panel:**
- Top of screen shows "Active Overrides" with countdown timers
- "Create Override" button → select zone, set multiplier, set duration, enter reason
- Override takes precedence over scheduled peaks

## Implementation Tasks

| # | Task | Owner | Estimate | Dependencies | Priority |
|---|------|-------|----------|--------------|----------|
| 1 | Create peak_hours migration | Backend Dev | 2h | None | P0 |
| 2 | Create surge_zones migration | Backend Dev | 3h | PostGIS enabled | P0 |
| 3 | Create surge_history migration | Backend Dev | 2h | None | P0 |
| 4 | Create surge_overrides migration | Backend Dev | 2h | None | P0 |
| 5 | Create PeakHour model with relationships | Backend Dev | 2h | Migration 1 | P0 |
| 6 | Create SurgeZone model with PostGIS | Backend Dev | 3h | Migration 2 | P0 |
| 7 | Create SurgeHistory model | Backend Dev | 1h | Migration 3 | P0 |
| 8 | Create SurgeOverride model | Backend Dev | 1h | Migration 4 | P0 |
| 9 | Update SurgePricingService with zone containment | Backend Dev | 8h | Models 5-8 | P0 |
| 10 | Update SurgePricingService with peak hour detection | Backend Dev | 4h | Model 5 | P0 |
| 11 | Add surge to FareCalculationService | Backend Dev | 3h | Service 9 | P0 |
| 12 | Create admin CRUD controllers for zones | Backend Dev | 6h | Models 5-6 | P1 |
| 13 | Create admin CRUD controllers for peak hours | Backend Dev | 4h | Model 5 | P1 |
| 14 | Create surge override controller | Backend Dev | 3h | Model 8 | P1 |
| 15 | Create surge history analytics endpoint | Backend Dev | 3h | Model 7 | P1 |
| 16 | Update fare-estimate endpoint with surge | Backend Dev | 2h | Service 9 | P1 |
| 17 | Update ride-request endpoint with surge | Backend Dev | 2h | Service 9 | P1 |
| 18 | Add Socket events for surge updates | Backend Dev | 4h | Services 9-10 | P1 |
| 19 | Create SurgePricingUpdateJob | Backend Dev | 4h | Services 9-10 | P1 |
| 20 | Build admin surge zone management UI | Frontend Dev | 12h | Endpoints 12-13 | P1 |
| 21 | Build admin peak hours scheduling UI | Frontend Dev | 8h | Endpoint 13 | P1 |
| 22 | Build admin surge override panel | Frontend Dev | 4h | Endpoint 14 | P2 |
| 23 | Update mobile rider UI with surge notification | Mobile Dev | 6h | Endpoint 16 | P1 |
| 24 | Update mobile driver UI with peak notifications | Mobile Dev | 4h | Socket 18 | P2 |
| 25 | Write unit tests for surge calculation | QA Engineer | 6h | Services 9-11 | P1 |
| 26 | Write integration tests for admin endpoints | QA Engineer | 4h | Endpoints 12-15 | P1 |

**Total Estimated Efficiency: 99 hours**

## Acceptance Criteria

- [ ] Surge multiplier applied to all ride fare estimates when zone is active
- [ ] Peak hours configurable via admin UI with weekly calendar
- [ ] Surge zones configurable via admin UI with map-based polygon drawing
- [ ] Rider sees surge multiplier and affected fare before booking confirmation
- [ ] Surge multiplier capped at 3.0x (configurable in SystemSetting)
- [ ] Surge history logged with zone, multiplier, demand/supply ratio, and timestamp
- [ ] Manual admin override takes precedence over scheduled peaks and auto-surge
- [ ] Surge calculation runs every 5 minutes via SurgePricingUpdateJob
- [ ] Zone containment uses PostGIS ST_Contains for accurate polygon matching
- [ ] Peak hour detection handles recurring and one-time schedules
- [ ] Driver receives notification when peak hours start/end in their zone
- [ ] Surge zones support both polygon and circular (center + radius) boundaries
- [ ] Admin can view surge history with time-range filtering and analytics
- [ ] All surge changes are logged in surge_history with trigger_type
- [ ] System gracefully handles zero active drivers (returns multiplier 1.0)
- [ ] Unit tests cover edge cases: zero drivers, overlapping zones, expired overrides
