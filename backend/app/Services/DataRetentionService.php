<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ConsentRecord;
use App\Models\Delivery;
use App\Models\IncidentReport;
use App\Models\KycVerification;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DataRetentionService
{
    private const RETENTION_PERIODS = [
        'ride_data' => 365 * 3,
        'payment_data' => 365 * 5,
        'delivery_data' => 365 * 3,
        'kyc_documents' => 365 * 5,
        'incident_reports' => 365 * 7,
        'consent_records' => 365 * 10,
        'user_accounts' => 365 * 7,
        'audit_logs' => 365 * 5,
        'chat_messages' => 365 * 2,
    ];

    public function anonymizeUser(User $user): void
    {
        DB::transaction(function () use ($user) {
            Ride::where('rider_id', $user->id)->update([
                'rider_id' => null,
                'pickup_address' => 'Anonymized',
                'dropoff_address' => 'Anonymized',
                'pickup_latitude' => 0,
                'pickup_longitude' => 0,
                'dropoff_latitude' => 0,
                'dropoff_longitude' => 0,
            ]);

            Ride::where('driver_id', $user->id)->update([
                'driver_id' => null,
            ]);

            Payment::where('payer_id', $user->id)->update([
                'payer_id' => null,
            ]);

            Delivery::where('sender_id', $user->id)->update([
                'sender_id' => null,
                'pickup_address' => 'Anonymized',
                'dropoff_address' => 'Anonymized',
                'pickup_latitude' => 0,
                'pickup_longitude' => 0,
                'dropoff_latitude' => 0,
                'dropoff_longitude' => 0,
                'sender_name' => 'Anonymized',
                'sender_phone' => 'Anonymized',
            ]);

            Delivery::where('driver_id', $user->id)->update([
                'driver_id' => null,
            ]);

            $this->deleteUserFiles($user);

            $user->update([
                'name' => 'Deleted User',
                'email' => 'deleted_'.$user->id.'@anonymized.local',
                'phone_number' => null,
                'password' => \Hash::make(Str::random(32)),
                'current_latitude' => 0,
                'current_longitude' => 0,
                'is_active' => false,
            ]);

            $user->delete();

            $user->tokens()->delete();
            $user->roles()->detach();
            $user->permissions()->detach();
        });
    }

    public function deleteUserData(User $user): void
    {
        DB::transaction(function () use ($user) {
            Ride::where('rider_id', $user->id)->delete();
            Ride::where('driver_id', $user->id)->update(['driver_id' => null]);
            Payment::where('payer_id', $user->id)->delete();
            Delivery::where('sender_id', $user->id)->delete();
            Delivery::where('driver_id', $user->id)->update(['driver_id' => null]);

            ConsentRecord::where('user_id', $user->id)->delete();
            KycVerification::where('user_id', $user->id)->delete();
            IncidentReport::where('reporter_id', $user->id)->update(['reporter_id' => null]);

            $this->deleteUserFiles($user);

            $user->tokens()->delete();
            $user->roles()->detach();
            $user->permissions()->detach();
            $user->delete();
        });
    }

    public function getRetentionInfo(): array
    {
        return [
            'retention_periods' => self::RETENTION_PERIODS,
            'last_cleanup' => $this->getLastCleanupDate(),
            'next_cleanup' => $this->getNextCleanupDate(),
            'records_to_anonymize' => $this->getRecordsToAnonymize(),
            'records_to_delete' => $this->getRecordsToDelete(),
        ];
    }

    public function runCleanup(): array
    {
        $results = [
            'anonymized' => 0,
            'deleted' => 0,
            'files_deleted' => 0,
        ];

        $results['anonymized'] = $this->anonymizeOldUserAccounts();
        $results['deleted'] = $this->deleteExpiredData();
        $results['files_deleted'] = $this->cleanupOrphanedFiles();

        $this->logCleanupRun($results);

        return $results;
    }

    private function anonymizeOldUserAccounts(): int
    {
        $cutoffDate = now()->subDays(self::RETENTION_PERIODS['user_accounts']);

        $inactiveUsers = User::where('is_active', false)
            ->where('deleted_at', '<', $cutoffDate)
            ->whereNull('anonymized_at')
            ->limit(100)
            ->get();

        $count = 0;
        foreach ($inactiveUsers as $user) {
            $this->anonymizeUser($user);
            $user->anonymized_at = now();
            $user->save();
            $count++;
        }

        return $count;
    }

    private function deleteExpiredData(): int
    {
        $count = 0;

        $rideCutoff = now()->subDays(self::RETENTION_PERIODS['ride_data']);
        $count += Ride::where('created_at', '<', $rideCutoff)
            ->where('status', 'completed')
            ->delete();

        $paymentCutoff = now()->subDays(self::RETENTION_PERIODS['payment_data']);
        $count += Payment::where('created_at', '<', $paymentCutoff)
            ->where('status', 'completed')
            ->delete();

        $deliveryCutoff = now()->subDays(self::RETENTION_PERIODS['delivery_data']);
        $count += Delivery::where('created_at', '<', $deliveryCutoff)
            ->where('status', 'delivered')
            ->delete();

        $kycCutoff = now()->subDays(self::RETENTION_PERIODS['kyc_documents']);
        $count += KycVerification::where('created_at', '<', $kycCutoff)
            ->where('status', '!=', KycVerification::STATUS_APPROVED)
            ->delete();

        $incidentCutoff = now()->subDays(self::RETENTION_PERIODS['incident_reports']);
        $count += IncidentReport::where('created_at', '<', $incidentCutoff)
            ->where('status', IncidentReport::STATUS_CLOSED)
            ->delete();

        return $count;
    }

    private function cleanupOrphanedFiles(): int
    {
        $count = 0;

        $kycFiles = Storage::disk('private')->allFiles('kyc');
        foreach ($kycFiles as $file) {
            $pathParts = explode('/', $file);
            $userId = $pathParts[1] ?? null;

            if ($userId && ! User::where('id', $userId)->exists()) {
                Storage::disk('private')->delete($file);
                $count++;
            }
        }

        $incidentFiles = Storage::disk('private')->allFiles('incidents');
        foreach ($incidentFiles as $file) {
            $pathParts = explode('/', $file);
            $incidentId = $pathParts[1] ?? null;

            if ($incidentId && ! IncidentReport::where('id', $incidentId)->exists()) {
                Storage::disk('private')->delete($file);
                $count++;
            }
        }

        return $count;
    }

    private function deleteUserFiles(User $user): void
    {
        $directories = [
            'kyc/'.$user->id,
            'profile/'.$user->id,
            'incidents',
        ];

        foreach ($directories as $dir) {
            if (Storage::disk('private')->exists($dir)) {
                Storage::disk('private')->delete($dir);
            }
        }
    }

    private function getLastCleanupDate(): ?string
    {
        $logPath = storage_path('logs/data_cleanup.log');
        if (! file_exists($logPath)) {
            return null;
        }

        $lines = file($logPath, FILE_IGNORE_NEW_LINES);

        return end($lines) ?? null;
    }

    private function getNextCleanupDate(): string
    {
        return now()->addDay()->startOfDay()->toDateTimeString();
    }

    private function getRecordsToAnonymize(): array
    {
        $cutoffDate = now()->subDays(self::RETENTION_PERIODS['user_accounts']);

        return [
            'inactive_users' => User::where('is_active', false)
                ->where('deleted_at', '<', $cutoffDate)
                ->whereNull('anonymized_at')
                ->count(),
        ];
    }

    private function getRecordsToDelete(): array
    {
        $rideCutoff = now()->subDays(self::RETENTION_PERIODS['ride_data']);
        $paymentCutoff = now()->subDays(self::RETENTION_PERIODS['payment_data']);
        $deliveryCutoff = now()->subDays(self::RETENTION_PERIODS['delivery_data']);

        return [
            'old_rides' => Ride::where('created_at', '<', $rideCutoff)->count(),
            'old_payments' => Payment::where('created_at', '<', $paymentCutoff)->count(),
            'old_deliveries' => Delivery::where('created_at', '<', $deliveryCutoff)->count(),
        ];
    }

    private function logCleanupRun(array $results): void
    {
        $logPath = storage_path('logs/data_cleanup.log');
        $message = sprintf(
            '[%s] Cleanup: anonymized=%d, deleted=%d, files=%d',
            now()->toDateTimeString(),
            $results['anonymized'],
            $results['deleted'],
            $results['files_deleted']
        );

        file_put_contents($logPath, $message.PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
