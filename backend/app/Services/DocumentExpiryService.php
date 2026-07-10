<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DriverProfile;
use App\Models\User;
use App\Models\UserDocument;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DocumentExpiryService
{
    public function __construct(
        protected PushNotificationService $notificationService,
        protected SmsService $smsService,
    ) {}

    public function checkExpiredDocuments(): array
    {
        $expiredDocuments = UserDocument::where('expires_at', '<', Carbon::now())
            ->where('status', '!=', 'expired')
            ->get();

        $results = ['checked' => 0, 'deactivated' => 0, 'warned' => 0];

        foreach ($expiredDocuments as $document) {
            $results['checked']++;
            $this->processExpiredDocument($document);
            $results['deactivated']++;
        }

        $expiringSoon = UserDocument::where('expires_at', '>', Carbon::now())
            ->where('expires_at', '<=', Carbon::now()->addDays(30))
            ->where('status', 'active')
            ->get();

        foreach ($expiringSoon as $document) {
            $this->warnExpiringDocument($document);
            $results['warned']++;
        }

        Log::info('Document expiry check completed', $results);
        return $results;
    }

    private function processExpiredDocument(UserDocument $document): void
    {
        DB::transaction(function () use ($document) {
            $document->update(['status' => 'expired']);

            $driver = $document->user;
            if ($driver && $driver->hasRole('driver')) {
                $driverProfile = DriverProfile::where('user_id', $driver->id)->first();
                if ($driverProfile) {
                    $driverProfile->update([
                        'is_verified' => false,
                        'verification_notes' => 'Document expired: ' . $document->type,
                    ]);
                }

                $this->notificationService->send(
                    $driver,
                    'Document Expired',
                    'Your ' . $document->type . ' has expired. Please upload a renewed document to continue driving.',
                    ['type' => 'document_expired', 'document_type' => $document->type]
                );
            }
        });
    }

    private function warnExpiringDocument(UserDocument $document): void
    {
        $driver = $document->user;
        if ($driver && $driver->hasRole('driver')) {
            $daysUntilExpiry = Carbon::now()->diffInDays(Carbon::parse($document->expires_at));

            $this->notificationService->send(
                $driver,
                'Document Expiring Soon',
                'Your ' . $document->type . ' expires in ' . $daysUntilExpiry . ' days. Please renew it to avoid service interruption.',
                ['type' => 'document_expiring', 'document_type' => $document->type, 'days_left' => $daysUntilExpiry]
            );
        }
    }

    public function deactivateDriverByDocument(User $driver, string $documentType): void
    {
        $driverProfile = DriverProfile::where('user_id', $driver->id)->first();
        if ($driverProfile) {
            $driverProfile->update([
                'is_verified' => false,
                'verification_notes' => 'Auto-deactivated due to expired ' . $documentType,
            ]);
        }

        $driver->update(['is_active' => false]);
    }
}
