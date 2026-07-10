<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\DataRetentionService;
use Illuminate\Console\Command;

class ScheduleDataRetentionCleanup extends Command
{
    protected $signature = 'retention:cleanup {--dry-run : Preview changes without executing}';

    protected $description = 'Run data retention cleanup to anonymize and delete expired user data';

    public function handle(DataRetentionService $retentionService): int
    {
        if ($this->option('dry-run')) {
            $info = $retentionService->getRetentionInfo();

            $this->info('Data Retention Cleanup (Dry Run)');
            $this->newLine();
            $this->info('Records to anonymize: '.$info['records_to_anonymize']['inactive_users']);
            $this->info('Records to delete:');
            foreach ($info['records_to_delete'] as $type => $count) {
                $this->line("  - {$type}: {$count}");
            }
            $this->newLine();
            $this->info('Last cleanup: '.($info['last_cleanup'] ?? 'Never'));
            $this->info('Next scheduled: '.$info['next_cleanup']);

            return Command::SUCCESS;
        }

        $this->info('Running data retention cleanup...');

        $results = $retentionService->runCleanup();

        $this->info('Cleanup completed:');
        $this->line("  - Anonymized: {$results['anonymized']} users");
        $this->line("  - Deleted: {$results['deleted']} records");
        $this->line("  - Files removed: {$results['files_deleted']}");

        return Command::SUCCESS;
    }
}
