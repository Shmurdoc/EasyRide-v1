# Ride Pooling System — EasyRyde

## Executive Summary

EasyRyde currently operates as a solo-ride-only platform. This plan implements a complete ride pooling system that matches riders with overlapping routes, splits fares proportionally, and provides drivers with optimized multi-stop navigation. The system reduces rider costs by 20-40%, increases driver utilization, and reduces overall vehicle trips in Phalaborwa. Estimated effort: 120 hours.

## Current State

- Zero pooling infrastructure — all rides are 1:1 rider-to-driver
- No fare splitting logic
- No route sharing or overlap detection
- No multi-stop navigation support
- `Ride` model assumes single rider per ride
- `FareCalculationService` calculates fare for single rider only
- No concept of "pool groups" or "ride shares"

## Data Model Design

### Pool Groups Table

```php
Schema::create('pool_groups', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->uuid('driver_id')->nullable()->index();
    $table->enum('status', ['matching', 'matched', 'in_progress', 'completed', 'cancelled'])->default('matching');
    $table->unsignedTinyInteger('max_passengers')->default(4);
    $table->unsignedTinyInteger('current_passengers')->default(0);
    $table->text('route_polyline')->nullable(); // Encoded polyline for entire route
    $table->decimal('total_distance_km', 8, 2)->nullable();
    $table->unsignedInteger('estimated_duration_minutes')->nullable();
    $table->decimal('base_fare', 10, 2)->default(0); // Total fare before splitting
    $table->decimal('total_savings', 10, 2)->default(0); // Combined rider savings
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
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes | tenants.id |
| driver_id | uuid | no | null | yes | drivers.id |
| status | enum | yes | 'matching' | yes (composite) | — |
| max_passengers | unsignedTinyInteger | yes | 4 | no | — |
| current_passengers | unsignedTinyInteger | yes | 0 | no | — |
| route_polyline | text | no | null | no | — |
| total_distance_km | decimal(8,2) | no | null | no | — |
| estimated_duration_minutes | unsignedInteger | no | null | no | — |
| base_fare | decimal(10,2) | yes | 0 | no | — |
| total_savings | decimal(10,2) | yes | 0 | no | — |
| matching_started_at | timestamp | yes | now() | no | — |
| matched_at | timestamp | no | null | no | — |
| started_at | timestamp | no | null | no | — |
| completed_at | timestamp | no | null | no | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

### Pool Rides Table

```php
Schema::create('pool_rides', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->uuid('pool_group_id')->index();
    $table->uuid('ride_id')->unique(); // Links to existing rides table
    $table->uuid('rider_id')->index();
    $table->unsignedTinyInteger('pickup_order')->nullable();
    $table->unsignedTinyInteger('dropoff_order')->nullable();
    $table->decimal('pickup_lat', 10, 7);
    $table->decimal('pickup_lng', 10, 7);
    $table->decimal('dropoff_lat', 10, 7);
    $table->decimal('dropoff_lng', 10, 7);
    $table->decimal('route_deviation_meters', 8, 2)->default(0);
    $table->decimal('rider_share', 10, 2); // What this rider pays
    $table->decimal('solo_fare', 10, 2); // What they would have paid solo
    $table->decimal('discount_percentage', 5, 2); // Calculated discount
    $table->enum('status', ['pending', 'confirmed', 'picked_up', 'dropped_off', 'cancelled')->default('pending');
    $table->boolean('flexible_timing')->default(false); // Rider accepts time flexibility
    $table->unsignedInteger('flexibility_minutes')->default(0); // Max extra minutes
    $table->timestamps();
    $table->foreign('tenant_id')->references('id')->on('tenants');
    $table->foreign('pool_group_id')->references('id')->on('pool_groups');
    $table->foreign('ride_id')->references('id')->on('rides');
    $table->foreign('rider_id')->references('id')->on('users');
    $table->index(['pool_group_id', 'status']);
    $table->index(['rider_id', 'status']);
});
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes | tenants.id |
| pool_group_id | uuid | yes | — | yes (composite) | pool_groups.id |
| ride_id | uuid | yes | — | unique | rides.id |
| rider_id | uuid | yes | — | yes (composite) | users.id |
| pickup_order | unsignedTinyInteger | no | null | no | — |
| dropoff_order | unsignedTinyInteger | no | null | no | — |
| pickup_lat | decimal(10,7) | yes | — | no | — |
| pickup_lng | decimal(10,7) | yes | — | no | — |
| dropoff_lat | decimal(10,7) | yes | — | no | — |
| dropoff_lng | decimal(10,7) | yes | — | no | — |
| route_deviation_meters | decimal(8,2) | yes | 0 | no | — |
| rider_share | decimal(10,2) | yes | — | no | — |
| solo_fare | decimal(10,2) | yes | — | no | — |
| discount_percentage | decimal(5,2) | yes | — | no | — |
| status | enum | yes | 'pending' | yes (composite) | — |
| flexible_timing | boolean | yes | false | no | — |
| flexibility_minutes | unsignedInteger | yes | 0 | no | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

### Pool Match Requests Table (Pending Match Queue)

```php
Schema::create('pool_match_requests', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('tenant_id')->index();
    $table->uuid('ride_id')->unique();
    $table->uuid('rider_id')->index();
    $table->decimal('pickup_lat', 10, 7);
    $table->decimal('pickup_lng', 10, 7);
    $table->decimal('dropoff_lat', 10, 7);
    $table->decimal('dropoff_lng', 10, 7);
    $table->decimal('route_polyline_encoded')->text(); // Rider's route
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
```

| Field | Type | Required | Default | Index | Foreign Key |
|-------|------|----------|---------|-------|-------------|
| id | uuid | yes | auto-generated | primary | — |
| tenant_id | uuid | yes | — | yes (composite) | tenants.id |
| ride_id | uuid | yes | — | unique | rides.id |
| rider_id | uuid | yes | — | yes (composite) | users.id |
| pickup_lat | decimal(10,7) | yes | — | no | — |
| pickup_lng | decimal(10,7) | yes | — | no | — |
| dropoff_lat | decimal(10,7) | yes | — | no | — |
| dropoff_lng | decimal(10,7) | yes | — | no | — |
| route_polyline_encoded | text | yes | — | no | — |
| max_deviation_meters | decimal(8,2) | yes | 500 | no | — |
| max_wait_minutes | unsignedInteger | yes | 10 | no | — |
| flexible_timing | boolean | yes | false | no | — |
| flexibility_minutes | unsignedInteger | yes | 0 | no | — |
| status | enum | yes | 'waiting' | yes (composite) | — |
| expires_at | timestamp | yes | — | yes (composite) | — |
| created_at | timestamp | yes | now() | no | — |
| updated_at | timestamp | yes | now() | no | — |

## Matching Algorithm

### Route Overlap Scoring

```
Function calculateOverlapScore(routeA_encoded, routeB_encoded):
    1. Decode polylines to coordinate arrays
    2. For each point in routeA, find nearest point in routeB
    3. Count points within DEVIATION_THRESHOLD (default: 500m)
    4. overlap_points = COUNT(nearest_points WHERE distance < threshold)
    5. total_points = COUNT(routeA_points)
    6. overlap_score = overlap_points / total_points
    7. Return overlap_score (0.0 to 1.0)

PostGIS Implementation:
    SELECT ST_LineSubstring(
        ST_GeomFromText('LINESTRING(...)'),
        0,
        ST_LineLocatePoint(
            ST_GeomFromText('LINESTRING(...)'),
            ST_Point(lng, lat)
        )
    );
```

### Time Window Compatibility

```
Function checkTimeCompatibility(requestA, requestB):
    1. pickupWindowA = [requestA.requested_time, requestA.requested_time + requestA.flexibility_minutes]
    2. pickupWindowB = [requestB.requested_time, requestB.requested_time + requestB.flexibility_minutes]
    3. overlap_start = MAX(pickupWindowA.start, pickupWindowB.start)
    4. overlap_end = MIN(pickupWindowA.end, pickupWindowB.end)
    5. IF overlap_start < overlap_end:
         time_score = (overlap_end - overlap_start) / MAX(windowA_duration, windowB_duration)
       ELSE:
         time_score = 0 (incompatible)
    6. Return time_score (0.0 to 1.0)
```

### Capacity Management

```
Function checkCapacity(pool_group, new_request):
    1. available_seats = pool_group.max_passengers - pool_group.current_passengers
    2. IF available_seats < 1: return false
    3. Check if adding new_request exceeds max_deviation for existing riders
    4. FOR EACH existing_rider in pool_group:
         deviation = calculateDeviation(existing_rider.route, new_request.route)
         IF deviation > existing_rider.max_deviation_meters: return false
       END FOR
    5. Return true
```

### Scoring Formula

```
combined_score = (overlap_score * 0.4) + (time_score * 0.3) + (distance_score * 0.3)

Where:
- overlap_score: 0.0-1.0 (route overlap percentage)
- time_score: 0.0-1.0 (time window compatibility)
- distance_score: 1.0 - (abs(requestA.distance - requestB.distance) / max(requestA.distance, requestB.distance))

Minimum threshold: combined_score >= 0.6 to create a pool match
Maximum pool size: 4 riders (configurable via SystemSetting)
```

### Matching Flow

```
1. Rider requests pool ride → added to pool_match_requests with status='waiting'
2. MatchJob runs every 30 seconds:
   a. Get all waiting requests where expires_at > now()
   b. For each request, calculate scores against all other waiting requests
   c. Sort by combined_score descending
   d. Take top match where score >= 0.6 AND capacity allows
   e. Create pool_group with status='matching'
   f. Create pool_rides for each matched rider
   g. Update pool_match_requests status to 'matched'
   h. If no match within MATCH_TIMEOUT (default: 5 minutes), convert to solo ride
3. When pool_group has max_passengers OR MATCH_TIMEOUT expires:
   a. Transition pool_group to status='matched'
   b. Search for driver
   c. Notify all riders of match with pool details
```

## Route Optimization

### Pickup Sequencing

```
Function optimizePickupOrder(pool_group):
    1. Get all pending pickups with coordinates
    2. Build distance matrix between all points (including driver start)
    3. Apply nearest-neighbor heuristic:
       a. Start at driver's current location
       b. Find nearest unvisited pickup
       c. Add to sequence
       d. Repeat until all pickups visited
    4. Calculate total route distance and duration
    5. Update pool_rides with pickup_order
    6. Generate combined route polyline
    7. Return optimized sequence

Alternative (exact): Hungarian algorithm for small N (4 riders)
```

### Dropoff Sequencing

```
Function optimizeDropoffOrder(pool_group):
    1. After all pickups complete, optimize dropoffs
    2. Apply nearest-neighbor from last pickup location
    3. Ensure no rider passes their destination
    4. Update pool_rides with dropoff_order
    5. Return optimized sequence
```

### Route Deviation Calculation

```
Function calculateDeviation(original_route, pooled_route):
    1. Decode both polylines
    2. For each point in original_route:
       a. Find nearest point in pooled_route
       b. Calculate distance between them
    3. deviation = MAX(all distances)
    4. Return deviation in meters
```

## Pricing Model

### Pool Discount Calculation

```
Function calculatePoolDiscount(overlap_score, group_size):
    base_discount = 0.20 (20% minimum)
    overlap_bonus = overlap_score * 0.20 (up to 20% for 100% overlap)
    group_bonus = (group_size - 1) * 0.02 (2% per additional rider, max 6%)
    total_discount = base_discount + overlap_bonus + group_bonus
    Return MIN(total_discount, 0.40) (cap at 40%)
```

### Individual Fare Calculation

```
Function calculateRiderShare(pool_group, rider):
    1. solo_fare = FareCalculationService.calculate(rider.ride)
    2. pool_fare = pool_group.base_fare
    3. rider_distance = haversine(rider.pickup, rider.dropoff)
    4. total_distance = pool_group.total_distance_km
    5. distance_ratio = rider_distance / total_distance
    6. raw_share = pool_fare * distance_ratio
    7. Apply pool discount: rider_share = raw_share * (1 - discount_percentage)
    8. rider_share = MAX(rider_share, MINIMUM_FARE) (ensure minimum fare)
    9. savings = solo_fare - rider_share
    10. Return { rider_share, solo_fare, savings, discount_percentage }
```

### Pool Fare Calculation

```
Function calculatePoolFare(pool_group):
    1. Get vehicle type rates from SystemSetting
    2. base_fare = vehicle_rates['base']
    3. distance_fare = total_distance_km * vehicle_rates['per_km']
    4. time_fare = estimated_duration_minutes * vehicle_rates['per_min']
    5. surge_multiplier = SurgePricingService.calculate(pool_group.zone)
    6. pool_fare = (base_fare + distance_fare + time_fare) * surge_multiplier
    7. Apply minimum fare: pool_fare = MAX(pool_fare, MINIMUM_FARE)
    8. Return pool_fare
```

## API Design

### Rider Endpoints

**POST /v1/rides/pool**
- Request a pool ride
- Body: `{ pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type, flexible_timing, flexibility_minutes, requested_time }`
- Validation: all coordinates required, vehicle_type in ['standard', 'xl', 'van'], flexibility_minutes max 30
- Response: `{ data: { pool_group_id, status: 'matching', estimated_wait, estimated_fare, estimated_savings } }`
- Socket: listens for `pool:matched`, `pool:status`

**GET /v1/rides/pool/{groupId}/status**
- Get current pool status
- Response: `{ data: { status, current_passengers, max_passengers, estimated_pickup_time, estimated_dropoff_time, route_polyline, riders: [{ id, pickup_order, dropoff_order, status }] } }`
- Note: rider identities are anonymized (show only first name initial + last 4 digits of phone)

**POST /v1/rides/pool/{groupId}/confirm**
- Confirm pool ride participation
- Body: `{ rider_id }`
- Response: `{ data: { confirmed: true, pool_group_id, rider_share, solo_fare, savings } }`

**POST /v1/rides/pool/{groupId}/cancel**
- Cancel pool ride participation
- Body: `{ rider_id, reason }`
- Side effects: removes rider from group, recalculates fares for remaining riders, triggers re-matching if group size drops below 2
- Response: `{ data: { cancelled: true, refund_amount } }`

### Driver Endpoints

**GET /v1/drivers/pool/requests**
- List available pool requests for driver's zone
- Query params: `zone_id`, `page`
- Response: `{ data: [{ pool_group_id, pickup_count, dropoff_count, estimated_fare, estimated_distance_km, estimated_duration_minutes, pickup_locations: [{ lat, lng }], route_polyline }] }`

**POST /v1/drivers/pool/accept**
- Accept a pool group
- Body: `{ pool_group_id }`
- Side effects: assigns driver, transitions pool_group to 'matched', calculates optimized route, notifies all riders
- Response: `{ data: { accepted: true, optimized_route, pickup_sequence: [{ rider_id, order, address, eta }], estimated_earnings } }`

**POST /v1/drivers/pool/pickup**
- Mark rider as picked up
- Body: `{ pool_group_id, rider_id }`
- Side effects: updates pool_rides status to 'picked_up', updates current_passengers, notifies remaining riders
- Response: `{ data: { picked_up: true, next_pickup: { rider_id, address, eta } } }`

**POST /v1/drivers/pool/dropoff**
- Mark rider as dropped off
- Body: `{ pool_group_id, rider_id }`
- Side effects: updates pool_rides status to 'dropped_off', decrements current_passengers, processes rider's payment, notifies rider
- Response: `{ data: { dropped_off: true, remaining_riders: count, next_dropoff: { rider_id, address, eta } } }`

**POST /v1/drivers/pool/complete**
- Complete pool ride (all riders dropped off)
- Body: `{ pool_group_id }`
- Side effects: transitions pool_group to 'completed', processes driver payout, logs completion metrics
- Response: `{ data: { completed: true, total_earnings, riders_served, total_savings_given } }`

### Admin Endpoints

**GET /v1/admin/pools**
- List active pool groups
- Query params: `status`, `driver_id`, `from`, `to`, `page`
- Response: `{ data: [{ id, status, driver: { id, name }, passengers, distance_km, duration_minutes, fare, created_at }] }`

**GET /v1/admin/pools/stats**
- Pool statistics for analytics
- Query params: `from`, `to`, `zone_id`
- Response: `{ data: { total_pools, avg_passengers, avg_discount, total_savings, pool_rate, solo_rate, avg_match_time, avg_deviation_meters } }`

**GET /v1/admin/pools/{id}/detail**
- Detailed pool group information
- Response: `{ data: { ...poolGroup, rides: [{ rider: { id, name }, pickup_order, dropoff_order, rider_share, solo_fare, savings, status }] } }`

### Socket Events

- `pool:matched` — rider notified of pool match with group details and fare
- `pool:pickup` — rider notified driver is en route to pickup
- `pool:dropoff` — rider notified approaching dropoff
- `pool:status` — real-time status update (new rider joined, rider cancelled, etc.)
- `pool:eta` — updated ETA calculations as route progresses
- `pool:arriving` — rider notified driver is 1 minute away

## Mobile UI Design

### Rider Experience

**Book Ride Screen (Pool Toggle)**
- Toggle switch: "Pool with others" (default: off)
- When toggled ON:
  - Fare estimate shows: "Solo: R85 | Pool: R58 (save R27, 32% off)"
  - Flexible timing checkbox with slider (0-30 minutes)
  - Info tooltip: "Pool with others heading your way. Save up to 40%."
  - Note: "Estimated wait may be longer for pool rides"

**Pool Status Screen (Post-Booking)**
- Header: "Pool ride matched!" with group icon showing 3/4 riders
- Map showing: all pickup points (anonymized), driver location, optimized route
- Timeline view:
  - Pickup 1: "J. M. — 2 min away" (anonymized)
  - Pickup 2: "S. K. — 5 min away" (anonymized)
  - Your pickup: "You — 8 min away"
  - Dropoff 1: "First dropoff"
  - Your dropoff: "Your destination — 18 min"
- Bottom card: "Your share: R58 | Save R27"
- Cancel button (with cancellation fee warning after confirmation)

**Pool Ride In-Progress Screen**
- Live map with route and all rider positions (anonymized)
- Progress bar: "Picked up 1/3 riders"
- ETA to your pickup: "Driver arriving in 3 min"
- ETA to your dropoff: "Arriving at your destination in 15 min"
- Chat with driver (group chat for pool)

### Driver Experience

**Pool Request Cards**
- Card shows: "Pool ride request — 3 riders"
- Pickup icons on mini-map with numbers (1, 2, 3)
- Summary: "3 pickups, 3 dropoffs | 12.5 km | ~35 min | R145"
- Accept/Decline buttons
- Tap to see full route with pickup sequence

**Optimized Navigation**
- Turn-by-turn navigation with multi-stop indicators
- Stop indicators: "Pickup 1 of 3 — J. M."
- Progress tracker: "Picked up 2/3 | Next: S. K."
- Individual confirm buttons for each pickup/dropoff
- "Complete Ride" button appears after all dropoffs

**Pool Earnings Display**
- Real-time earnings calculation as each rider is dropped off
- Running total: "R45 earned so far"
- Final summary: "Total earned: R145 | 3 riders served | Avg: R48/rider"

## Implementation Tasks

| # | Task | Owner | Estimate | Dependencies | Priority |
|---|------|-------|----------|--------------|----------|
| 1 | Create pool_groups migration | Backend Dev | 3h | None | P0 |
| 2 | Create pool_rides migration | Backend Dev | 3h | Migration 1 | P0 |
| 3 | Create pool_match_requests migration | Backend Dev | 2h | None | P0 |
| 4 | Create PoolGroup model with relationships | Backend Dev | 2h | Migration 1 | P0 |
| 5 | Create PoolRide model with relationships | Backend Dev | 2h | Migration 2 | P0 |
| 6 | Create PoolMatchRequest model | Backend Dev | 1h | Migration 3 | P0 |
| 7 | Implement route overlap scoring (PostGIS) | Backend Dev | 8h | Models 4-6 | P0 |
| 8 | Implement time window compatibility check | Backend Dev | 4h | Model 6 | P0 |
| 9 | Implement capacity management logic | Backend Dev | 3h | Models 4-6 | P0 |
| 10 | Create PoolMatchingService | Backend Dev | 8h | Services 7-9 | P0 |
| 11 | Implement pickup/dropoff sequencing | Backend Dev | 6h | Service 10 | P0 |
| 12 | Implement pool fare calculation | Backend Dev | 4h | FareCalculationService | P0 |
| 13 | Create PoolController (rider endpoints) | Backend Dev | 6h | Services 10-12 | P1 |
| 14 | Create DriverPoolController | Backend Dev | 6h | Services 10-12 | P1 |
| 15 | Create AdminPoolController | Backend Dev | 4h | Models 4-6 | P1 |
| 16 | Create MatchPoolRidesJob | Backend Dev | 4h | Service 10 | P1 |
| 17 | Add Socket events for pool updates | Backend Dev | 6h | Services 10-12 | P1 |
| 18 | Update FareCalculationService for pool | Backend Dev | 3h | Service 12 | P1 |
| 19 | Build rider pool booking UI | Mobile Dev | 12h | Endpoints 13 | P1 |
| 20 | Build rider pool status UI | Mobile Dev | 8h | Socket 17 | P1 |
| 21 | Build driver pool request UI | Mobile Dev | 8h | Endpoint 14 | P1 |
| 22 | Build driver multi-stop navigation | Mobile Dev | 12h | Endpoint 14 | P2 |
| 23 | Build admin pool management UI | Frontend Dev | 8h | Endpoint 15 | P2 |
| 24 | Write unit tests for matching algorithm | QA Engineer | 8h | Services 7-10 | P1 |
| 25 | Write integration tests for pool lifecycle | QA Engineer | 6h | All endpoints | P1 |
| 26 | Load test with 100 concurrent pool requests | QA Engineer | 4h | All services | P2 |

**Total Estimated Effort: 140 hours**

## Acceptance Criteria

- [ ] Pool matching finds routes with >60% overlap score
- [ ] Pool discount correctly calculated (20-40% based on overlap and group size)
- [ ] Rider sees pool status, co-rider count, and savings before and during ride
- [ ] Driver receives optimized multi-stop route with pickup/dropoff sequence
- [ ] Cancellation by one rider does not cancel the entire pool for others
- [ ] Pool works correctly with surge pricing (multipliers stack)
- [ ] Maximum 4 riders per pool (configurable via SystemSetting)
- [ ] Pool match timeout (5 minutes) converts to solo ride if no match found
- [ ] Route deviation for any rider does not exceed their configured max_deviation_meters
- [ ] Rider identities are anonymized in pool status (first initial + last 4 digits)
- [ ] Fare splitting is proportional to distance traveled by each rider
- [ ] Driver earnings are correctly calculated for pool rides
- [ ] Pool ride completes only after all riders are dropped off
- [ ] Admin can view pool statistics and individual pool details
- [ ] All pool events are broadcast via Socket in real-time
- [ ] Pool matching job runs every 30 seconds and processes waiting requests
