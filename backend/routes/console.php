<?php

use App\Jobs\AggregateDailyStatsJob;
use App\Jobs\CleanupStaleRidesJob;
use App\Jobs\DriverArrivalMonitorJob;
use App\Jobs\DriverAcceptTimeoutJob;
use App\Jobs\ExpirePromoCodesJob;
use App\Jobs\MonitorSystemHealthJob;
use App\Jobs\ProcessPayoutsBatchJob;
use App\Jobs\ReconcileWalletBalancesJob;
use App\Jobs\RevokeExpiredTokensJob;
use App\Jobs\ReleaseEscrowBatchJob;
use App\Jobs\RideTimeoutJob;
use App\Jobs\SendDriverEarningsSummariesJob;
use App\Jobs\SendLowBalanceAlertsJob;
use App\Jobs\SyncDriverLocationsJob;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Schedule;

// Existing command-based schedules
Schedule::command('payments:process --type=escrow')->everyMinute();
Schedule::command('payments:process --type=payouts')->everyMinute();
Schedule::command('payments:process --type=reconciliation')->hourly();
Schedule::command('rides:expire-stale')->everyThirtySeconds();
Schedule::command('scheduled-rides:publish')->everyMinute();
Schedule::command('model:prune', ['--model' => [WalletTransaction::class]])->daily();

// Daily at midnight - Expire promo codes
Schedule::job(new ExpirePromoCodesJob)->dailyAt('00:00');

// Daily at 1 AM - Aggregate daily stats
Schedule::job(new AggregateDailyStatsJob)->dailyAt('01:00');

// Daily at 2 AM - Release escrow
Schedule::job(new ReleaseEscrowBatchJob)->dailyAt('02:00');

// Daily at 3 AM - Process payouts
Schedule::job(new ProcessPayoutsBatchJob)->dailyAt('03:00');

// Daily at 3:30 AM SAST - Data retention cleanup (PIPA/POPIA compliance)
Schedule::command('retention:cleanup')->dailyAt('03:30');

// Daily at 4 AM - Revoke expired tokens
Schedule::job(new RevokeExpiredTokensJob)->dailyAt('04:00');

// Daily at 5 AM - Reconcile wallet balances
Schedule::job(new ReconcileWalletBalancesJob)->dailyAt('05:00');

// Weekly Monday at 8 AM - Driver earnings summaries
Schedule::job(new SendDriverEarningsSummariesJob)->weeklyOn(1, '08:00');

// Every hour - Low balance alerts
Schedule::job(new SendLowBalanceAlertsJob)->hourly();

// Every 30 minutes - System health monitor
Schedule::job(new MonitorSystemHealthJob)->everyThirtyMinutes();

// Every 15 minutes - Cleanup stale rides
Schedule::job(new CleanupStaleRidesJob)->everyFifteenMinutes();

// Every 5 minutes - Sync driver locations
Schedule::job(new SyncDriverLocationsJob)->everyFiveMinutes();

// ── Ride lifecycle jobs (event-driven, NOT cron-scheduled) ──────────────
// RideTimeoutJob       → dispatched by RideStateService when ride enters 'searching'
// DriverAcceptTimeoutJob → dispatched by RideStateService when driver is assigned
// DriverArrivalMonitorJob → dispatched by RideStateService when driver is en_route/arrived
// These are imported above for reference but registered via their respective
// Service dispatch calls, not the scheduler.
