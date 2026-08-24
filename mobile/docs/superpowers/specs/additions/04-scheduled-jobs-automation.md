# Scheduled Jobs & Automation — EasyRyde

## Executive Summary

EasyRyde has several jobs that exist in the codebase but are not scheduled in the Laravel Scheduler. Additionally, critical automation jobs for surge pricing, peak detection, cleanup, and reporting are missing entirely. This plan defines all background jobs with precise schedules, queue priorities, timeout configurations, retry logic, failure handling, and monitoring. Estimated effort: 56 hours.

## Current State

### Jobs That Exist But Are Not Scheduled
- `ReleaseEscrowJob` (`F:\EasyRyde\backend\app\Jobs\ReleaseEscrowJob.php`) — releases held payments to drivers
- `MatchDriversJob` (`F:\EasyRyde\backend\app\Jobs\MatchDriversJob.php`) — matches available drivers to pending rides
- `ProcessPaymentJob` (`F:\EasyRyde\backend\app\Jobs\ProcessPaymentJob.php`) — processes ride payments via Stripe/Paystack
- `ProcessPayoutJob` (`F:\EasyRyde\backend\app\Jobs\ProcessPayoutJob.php`) — initiates driver payouts via EFT
- `UpdateDriverLocationJob` (`F:\EasyRyde\backend\app\Jobs\UpdateDriverLocationJob.php`) — updates driver GPS locations in cache

### Jobs That Don't Exist Yet
- `SurgePricingUpdateJob` — recalculates surge multipliers per zone
- `PeakHourDetectionJob` — detects and activates peak hour schedules
- `CleanupExpiredPromoCodesJob` — deactivates expired promotional codes
- `CleanupStaleLocationsJob` — removes driver locations older than 24 hours
- `SendScheduledRideRemindersJob` — sends reminders for scheduled rides
- `GenerateDailyReportsJob` — generates daily ride, revenue, and driver reports
- `ReconcileCashPaymentsJob` — reconciles cash payments with driver declarations
- `MatchPoolRidesJob` — matches waiting pool ride requests
- `ExpireStaleRidesJob` — expires rides stuck in 'searching' status

## Job Specifications

### ReleaseEscrowJob
- **File:** `F:\EasyRyde\backend\app\Jobs\ReleaseEscrowJob.php`
- **Schedule:** Every hour (`$schedule->job(new ReleaseEscrowJob)->hourly();`)
- **Logic:** Find payments where `held_until < now()` AND `status = 'held'`. For each: (1) Update payment status to 'released', (2) Credit driver pending_balance, (3) Create DriverEarning record, (4) Log release in payment_audit_log
- **Queue:** high
- **Timeout:** 300 seconds
- **Retry:** 3 attempts, 60 seconds delay between retries
- **Failure:** Log error with payment_id to `jobs_failed_log`. Send Slack notification to #payments-alerts channel. Add to manual intervention queue in admin dashboard
- **Rollback:** None needed (idempotent — checks payment status before processing)
- **Dependencies:** None
- **Estimated Effort:** 2 hours to schedule and configure

### ExpireStaleRidesJob
- **File:** `F:\EasyRyde\backend\app\Jobs\ExpireStaleRidesJob.php` (new)
- **Schedule:** Every 5 minutes (`$schedule->job(new ExpireStaleRidesJob)->everyFiveMinutes();`)
- **Logic:** Find rides where `status = 'searching'` AND `created_at < now() - interval 15 minutes`. For each: (1) Update status to 'expired', (2) Release any held driver, (3) Notify rider via Socket (`ride:expired`), (4) Log expiry reason
- **Queue:** default
- **Timeout:** 60 seconds
- **Retry:** 1 attempt (no retry for cleanup jobs)
- **Failure:** Log error, continue (non-critical, will retry next cycle)
- **Rollback:** None needed
- **Dependencies:** None
- **Estimated Effort:** 3 hours to create and schedule

### ProcessPayoutJob
- **File:** `F:\EasyRyde\backend\app\Jobs\ProcessPayoutJob.php`
- **Schedule:** Daily at 02:00 SAST (`$schedule->job(new ProcessPayoutJob)->dailyAt('02:00');`)
- **Logic:** (1) Find all drivers with `pending_balance > MINIMUM_PAYOUT` (R100), (2) For each driver: calculate earnings for previous day, create DriverPayout record, initiate EFT via Paystack, (3) Update driver pending_balance to 0, (4) Create payout receipt, (5) Send email notification to driver
- **Queue:** high
- **Timeout:** 600 seconds
- **Retry:** 3 attempts, 300 seconds delay between retries
- **Failure:** Log error with driver_id and amount. Send Slack notification to #payouts-alerts. Add to admin retry queue. Do NOT deduct from pending_balance on failure
- **Rollback:** If EFT fails, revert DriverPayout status to 'pending', restore pending_balance
- **Dependencies:** Paystack transfer API configured
- **Estimated Effort:** 4 hours to create and schedule

### SurgePricingUpdateJob
- **File:** `F:\EasyRyde\backend\app\Jobs\SurgePricingUpdateJob.php` (new)
- **Schedule:** Every 5 minutes (`$schedule->job(new SurgePricingUpdateJob)->everyFiveMinutes();`)
- **Logic:** (1) Get all active surge zones, (2) For each zone: count active drivers (status='online' AND current_zone=zone), count pending rides (status='searching' AND pickup_zone=zone), calculate demand_supply_ratio, (3) Apply surge algorithm from SurgePricingService, (4) Update zone multiplier in cache (Redis key: `surge:zone:{zone_id}`), (5) Log to surge_history table, (6) Broadcast Socket event if multiplier changed
- **Queue:** default
- **Timeout:** 30 seconds
- **Retry:** 1 attempt
- **Failure:** Use last known surge multiplier from cache (graceful degradation). Log error but do not alert (transient failure)
- **Rollback:** None needed (uses cached values)
- **Dependencies:** SurgePricingService, SurgeZone model
- **Estimated Effort:** 4 hours to create and schedule

### PeakHourDetectionJob
- **File:** `F:\EasyRyde\backend\app\Jobs\PeakHourDetectionJob.php` (new)
- **Schedule:** Every minute (`$schedule->job(new PeakHourDetectionJob)->everyMinute();`)
- **Logic:** (1) Get current day_of_week and time, (2) Query peak_hours table for matching schedules, (3) For each active peak: set cache key `peak:active:{day}:{time}` with multiplier, (4) If peak just started (was not active last minute), broadcast `peak:started` to drivers, (5) If peak just ended, broadcast `peak:ended`, (6) Clean up expired one-time peaks
- **Queue:** default
- **Timeout:** 15 seconds
- **Retry:** 1 attempt
- **Failure:** Log error, continue (peak detection will catch up next cycle)
- **Rollback:** None needed
- **Dependencies:** PeakHour model
- **Estimated Effort:** 3 hours to create and schedule

### CleanupExpiredPromoCodesJob
- **File:** `F:\EasyRyde\backend\app\Jobs\CleanupExpiredPromoCodesJob.php` (new)
- **Schedule:** Daily at 03:00 SAST (`$schedule->job(new CleanupExpiredPromoCodesJob)->dailyAt('03:00');`)
- **Logic:** (1) Find promo codes where `expires_at < now()` AND `is_active = true`, (2) Set `is_active = false` for each, (3) Log deactivation count, (4) Optionally: find promo codes where `usage_count >= max_uses` and deactivate
- **Queue:** default
- **Timeout:** 120 seconds
- **Retry:** 2 attempts, 60 seconds delay
- **Failure:** Log error, retry next day (non-critical)
- **Rollback:** None needed
- **Dependencies:** PromoCode model
- **Estimated Effort:** 2 hours to create and schedule

### CleanupStaleLocationsJob
- **File:** `F:\EasyRyde\backend\app\Jobs\CleanupStaleLocationsJob.php` (new)
- **Schedule:** Every hour (`$schedule->job(new CleanupStaleLocationsJob)->hourly();`)
- **Logic:** (1) Find driver_locations where `recorded_at < now() - interval 24 hours`, (2) Delete stale records, (3) Log count of deleted records, (4) Optionally: archive to driver_location_history table before deleting
- **Queue:** default
- **Timeout:** 180 seconds
- **Retry:** 2 attempts, 60 seconds delay
- **Failure:** Log error, continue (stale locations will be cleaned next cycle)
- **Rollback:** None needed (data archived before deletion)
- **Dependencies:** DriverLocation model
- **Estimated Effort:** 2 hours to create and schedule

### SendScheduledRideRemindersJob
- **File:** `F:\EasyRyde\backend\app\Jobs\SendScheduledRideRemindersJob.php` (new)
- **Schedule:** Every 5 minutes (`$schedule->job(new SendScheduledRideRemindersJob)->everyFiveMinutes();`)
- **Logic:** (1) Find scheduled rides where `scheduled_at` is between now() and now() + 30 minutes AND `reminder_sent = false`, (2) For each: send push notification via Firebase, send SMS via Twilio (if enabled), update `reminder_sent = true`, (3) Log notification status
- **Queue:** default
- **Timeout:** 120 seconds
- **Retry:** 2 attempts, 30 seconds delay
- **Failure:** Log error, mark as failed but allow retry next cycle
- **Rollback:** None needed
- **Dependencies:** Firebase Cloud Messaging, Twilio (optional)
- **Estimated Effort:** 3 hours to create and schedule

### GenerateDailyReportsJob
- **File:** `F:\EasyRyde\backend\app\Jobs\GenerateDailyReportsJob.php` (new)
- **Schedule:** Daily at 04:00 SAST (`$schedule->job(new GenerateDailyReportsJob)->dailyAt('04:00');`)
- **Logic:** (1) Calculate yesterday's metrics: total rides, total revenue, average ride distance, average ride duration, active drivers, new riders, pool ride count, surge revenue, (2) Generate PDF report, (3) Store in reports table, (4) Send email to admin with report attached, (5) Update dashboard cache
- **Queue:** default
- **Timeout:** 300 seconds
- **Retry:** 2 attempts, 120 seconds delay
- **Failure:** Log error, alert admin via Slack, retry next cycle
- **Rollback:** None needed (report regeneration is idempotent)
- **Dependencies:** Report models, PDF generation library
- **Estimated Effort:** 4 hours to create and schedule

### ReconcileCashPaymentsJob
- **File:** `F:\EasyRyde\backend\app\Jobs\ReconcileCashPaymentsJob.php` (new)
- **Schedule:** Daily at 05:00 SAST (`$schedule->job(new ReconcileCashPaymentsJob)->dailyAt('05:00');`)
- **Logic:** (1) Find cash payments from yesterday, (2) Compare with driver cash declarations, (3) Flag discrepancies > R10, (4) Create reconciliation report, (5) Alert admin if total discrepancy > R100, (6) Update driver cash_balance
- **Queue:** default
- **Timeout:** 180 seconds
- **Retry:** 2 attempts, 60 seconds delay
- **Failure:** Log error, alert admin, manual reconciliation required
- **Rollback:** None needed (comparison only, no financial changes until verified)
- **Dependencies:** Payment model, DriverCashDeclaration model
- **Estimated Effort:** 3 hours to create and schedule

### MatchPoolRidesJob
- **File:** `F:\EasyRyde\backend\app\Jobs\MatchPoolRidesJob.php` (new)
- **Schedule:** Every 30 seconds (`$schedule->job(new MatchPoolRidesJob)->everyThirtySeconds();`)
- **Logic:** (1) Get all pool_match_requests where `status = 'waiting'` AND `expires_at > now()`, (2) For each request, calculate overlap scores against other waiting requests, (3) Sort by combined_score descending, (4) Create pool groups for matches with score >= 0.6, (5) Notify matched riders via Socket, (6) Expire unmatched requests after timeout
- **Queue:** high (time-sensitive matching)
- **Timeout:** 45 seconds
- **Retry:** 1 attempt
- **Failure:** Log error, requests remain in queue for next cycle
- **Rollback:** None needed
- **Dependencies:** PoolMatchingService, PoolMatchRequest model
- **Estimated Effort:** 4 hours to create and schedule

## Scheduler Configuration

### Laravel Horizon (`config/horizon.php`)

```php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses' => 10,
            'maxTime' => 3600,
            'maxJobs' => 1000,
            'memory' => 128,
            'tries' => 3,
            'timeout' => 60,
            'nice' => 0,
        ],
    ],
    'staging' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['high', 'default', 'low'],
            'balance' => 'simple',
            'maxProcesses' => 3,
            'maxTime' => 3600,
            'maxJobs' => 500,
            'memory' => 128,
            'tries' => 3,
            'timeout' => 60,
        ],
    ],
],

'queue_configuration' => [
    'high' => [
        'connection' => 'redis',
        'queue' => 'high',
        'maxProcesses' => 5,
        'balance' => 'simple',
    ],
    'default' => [
        'connection' => 'redis',
        'queue' => 'default',
        'maxProcesses' => 5,
        'balance' => 'auto',
    ],
    'low' => [
        'connection' => 'redis',
        'queue' => 'low',
        'maxProcesses' => 2,
        'balance' => 'simple',
    ],
],
```

### Laravel Scheduler (`app/Console/Kernel.php`)

```php
protected function schedule(Schedule $schedule): void
{
    // High priority - financial operations
    $schedule->job(new ReleaseEscrowJob)->hourly()->withoutOverlapping()->queue('high');
    $schedule->job(new ProcessPayoutJob)->dailyAt('02:00')->withoutOverlapping()->queue('high');
    $schedule->job(new MatchPoolRidesJob)->everyThirtySeconds()->withoutOverlapping(45)->queue('high');

    // Default priority - operational jobs
    $schedule->job(new ExpireStaleRidesJob)->everyFiveMinutes()->withoutOverlapping()->queue('default');
    $schedule->job(new SurgePricingUpdateJob)->everyFiveMinutes()->withoutOverlapping()->queue('default');
    $schedule->job(new PeakHourDetectionJob)->everyMinute()->withoutOverlapping(15)->queue('default');
    $schedule->job(new SendScheduledRideRemindersJob)->everyFiveMinutes()->withoutOverlapping()->queue('default');
    $schedule->job(new CleanupStaleLocationsJob)->hourly()->withoutOverlapping()->queue('default');

    // Low priority - maintenance and reporting
    $schedule->job(new CleanupExpiredPromoCodesJob)->dailyAt('03:00')->withoutOverlapping()->queue('low');
    $schedule->job(new GenerateDailyReportsJob)->dailyAt('04:00')->withoutOverlapping()->queue('low');
    $schedule->job(new ReconcileCashPaymentsJob)->dailyAt('05:00')->withoutOverlapping()->queue('low');
}
```

### Queue Priority Rules

| Queue | Max Processes | Use Cases | Timeout |
|-------|---------------|-----------|---------|
| high | 5 | Payment processing, escrow release, pool matching | 60s |
| default | 5 | Surge updates, ride expiry, reminders, cleanup | 60s |
| low | 2 | Reports, reconciliation, promo cleanup | 120s |

## Monitoring & Alerting

### Job Metrics (Tracked in Redis)

```
Keys:
- jobs:processed:{queue}:{job_name} — counter, incremented on completion
- jobs:failed:{queue}:{job_name} — counter, incremented on failure
- jobs:duration:{queue}:{job_name} — histogram of execution times
- jobs:queue_depth:{queue} — gauge of pending jobs per queue
- jobs:latest_run:{job_name} — timestamp of last successful run
```

### Metrics Collection

```php
// In each job's handle() method:
Redis::incr("jobs:processed:{$this->queue}:{$jobName}");
Redis::hset("jobs:duration:{$this->queue}:{$jobName}", $executionTime, now());

// In each job's failed() method:
Redis::incr("jobs:failed:{$this->queue}:{$jobName}");
```

### Alerting Rules

| Metric | Condition | Severity | Action |
|--------|-----------|----------|--------|
| Queue depth (high) | > 50 | Warning | Slack #ops-warning |
| Queue depth (high) | > 200 | Critical | Slack #ops-critical + PagerDuty |
| Queue depth (default) | > 100 | Warning | Slack #ops-warning |
| Queue depth (default) | > 500 | Critical | Slack #ops-critical + PagerDuty |
| Queue depth (low) | > 50 | Warning | Slack #ops-warning |
| Failure rate (any queue) | > 5% (1-hour window) | Warning | Slack #ops-warning |
| Failure rate (any queue) | > 20% (1-hour window) | Critical | Slack #ops-critical + PagerDuty |
| Job duration | > 2x average (1-hour window) | Warning | Slack #ops-warning |
| Job duration | > 5x average (1-hour window) | Critical | Slack #ops-critical |
| Missing job run | Job not run in 2x expected interval | Critical | Slack #ops-critical |
| Financial job failure | ReleaseEscrow or ProcessPayout fails | Critical | Slack #payments-critical + PagerDuty |

### Dashboard Panel (Admin)

```
Job Health Dashboard:
┌─────────────────────────────────────────────────────────┐
│ Queue Depth    │ Processed (1h) │ Failed (1h) │ Avg Duration │
│ high: 12       │ 847            │ 3 (0.4%)    │ 2.3s         │
│ default: 45    │ 2,341          │ 12 (0.5%)   │ 1.8s         │
│ low: 8         │ 156            │ 0 (0.0%)    │ 4.2s         │
├─────────────────────────────────────────────────────────┤
│ Last Run Times:                                         │
│ ReleaseEscrowJob:     12:00 ✅ (2.1s)                  │
│ SurgePricingUpdate:   12:05 ✅ (1.2s)                  │
│ MatchPoolRides:       12:05:30 ✅ (3.4s)               │
│ ProcessPayoutJob:     02:00 ✅ (45.2s)                 │
│ GenerateDailyReports: 04:00 ✅ (128.5s)                │
└─────────────────────────────────────────────────────────┘
```

## Implementation Tasks

| # | Task | Owner | Estimate | Dependencies | Priority |
|---|------|-------|----------|--------------|----------|
| 1 | Register all existing jobs in Kernel.php scheduler | Backend Dev | 2h | None | P0 |
| 2 | Configure Horizon queue workers | Backend Dev | 3h | Redis configured | P0 |
| 3 | Create ExpireStaleRidesJob | Backend Dev | 3h | None | P0 |
| 4 | Create SurgePricingUpdateJob | Backend Dev | 4h | SurgePricingService | P1 |
| 5 | Create PeakHourDetectionJob | Backend Dev | 3h | PeakHour model | P1 |
| 6 | Create MatchPoolRidesJob | Backend Dev | 4h | PoolMatchingService | P1 |
| 7 | Create CleanupExpiredPromoCodesJob | Backend Dev | 2h | PromoCode model | P2 |
| 8 | Create CleanupStaleLocationsJob | Backend Dev | 2h | DriverLocation model | P2 |
| 9 | Create SendScheduledRideRemindersJob | Backend Dev | 3h | Firebase configured | P1 |
| 10 | Create GenerateDailyReportsJob | Backend Dev | 4h | Report models | P2 |
| 11 | Create ReconcileCashPaymentsJob | Backend Dev | 3h | Payment models | P2 |
| 12 | Add job metrics collection to all jobs | Backend Dev | 4h | Redis | P1 |
| 13 | Configure alerting rules in Horizon | Backend Dev | 3h | Slack/PagerDuty configured | P1 |
| 14 | Build job health dashboard panel | Frontend Dev | 6h | Metrics 12 | P2 |
| 15 | Write unit tests for all new jobs | QA Engineer | 6h | Jobs 3-11 | P1 |
| 16 | Load test queue workers under stress | QA Engineer | 3h | All jobs configured | P2 |

**Total Estimated Effort: 55 hours**

## Acceptance Criteria

- [ ] All 15 jobs registered in Kernel.php scheduler with correct schedules
- [ ] All jobs have proper queue priority (high/default/low)
- [ ] All jobs have timeout configured (no infinite-running jobs)
- [ ] All jobs have retry logic with appropriate attempt counts
- [ ] All jobs have failure notifications (Slack for critical, log for non-critical)
- [ ] Horizon dashboard shows real-time queue metrics
- [ ] Alerting rules configured for queue depth, failure rate, and duration
- [ ] Job health dashboard shows last run times and success/failure status
- [ ] Financial jobs (escrow, payout) have dedicated high-priority queue
- [ ] All jobs use `withoutOverlapping()` to prevent concurrent execution
- [ ] Surge pricing updates every 5 minutes with cached results
- [ ] Pool matching runs every 30 seconds for timely matches
- [ ] Daily reports generated by 04:00 SAST
- [ ] Stale rides expired within 15 minutes of creation
- [ ] Scheduled ride reminders sent 30 minutes before pickup
- [ ] All job metrics stored in Redis for monitoring
