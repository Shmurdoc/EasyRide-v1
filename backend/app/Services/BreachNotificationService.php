<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BreachNotificationService
{
    private const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

    private const REMEDIATION_STEPS = [
        'password_reset' => [
            'Force password reset for all affected users',
            'Invalidate active sessions',
            'Review authentication logs for unauthorized access',
        ],
        'data_exposure' => [
            'Identify the scope of exposed data',
            'Contain the breach source',
            'Notify affected users within 72 hours',
            'Report to Information Regulator if required',
        ],
        'unauthorized_access' => [
            'Revoke compromised credentials immediately',
            'Review access logs for affected accounts',
            'Enable enhanced monitoring',
            'Consider credit monitoring for affected users',
        ],
        'system_compromise' => [
            'Isolate affected systems',
            'Engage incident response team',
            'Preserve forensic evidence',
            'Notify authorities as required by POPIA',
        ],
    ];

    public function notifyDataBreach(array $breachData): void
    {
        $validated = $this->validateBreachData($breachData);

        $this->logBreach($validated);
        $this->sendAdminAlert($validated);

        if (! empty($validated['affected_user_ids'])) {
            $this->notifyAffectedUsers(
                $validated['affected_user_ids'],
                $validated['breach_type']
            );
        }
    }

    public function sendAdminAlert(array $breachData): void
    {
        $adminEmail = config('app.admin_email', 'admin@easyryde.co.za');

        $severity = $breachData['severity'] ?? 'unknown';
        $breachType = $breachData['breach_type'] ?? 'unknown';
        $affectedCount = $breachData['affected_users_count'] ?? 0;
        $description = $breachData['description'] ?? 'No description provided';
        $timestamp = $breachData['detected_at'] ?? now()->toDateTimeString();

        Mail::raw(
            $this->buildAdminEmailBody($breachData),
            function ($message) use ($adminEmail, $severity, $breachType) {
                $message->to($adminEmail)
                    ->subject("[EasyRyde Security Alert] {$severity} breach: {$breachType}")
                    ->from('security@easyryde.co.za', 'EasyRyde Security');
            }
        );

        Log::channel('security')->critical('Breach admin alert sent', [
            'breach_type' => $breachType,
            'severity' => $severity,
            'affected_users_count' => $affectedCount,
            'admin_email' => $adminEmail,
        ]);
    }

    public function notifyAffectedUsers(array $userIds, string $breachType): void
    {
        $users = User::whereIn('id', $userIds)->get();

        foreach ($users as $user) {
            Mail::raw(
                $this->buildUserEmailBody($user, $breachType),
                function ($message) use ($user, $breachType) {
                    $message->to($user->email)
                        ->subject('Important Security Notice - EasyRyde')
                        ->from('security@easyryde.co.za', 'EasyRyde Security');
                }
            );

            Log::channel('security')->info('Breach notification sent to user', [
                'user_id' => $user->id,
                'breach_type' => $breachType,
            ]);
        }
    }

    public function logBreach(array $breachData): void
    {
        Log::channel('security')->critical('DATA BREACH RECORDED', [
            'breach_id' => $breachData['breach_id'] ?? uniqid('breach_', true),
            'breach_type' => $breachData['breach_type'],
            'severity' => $breachData['severity'],
            'description' => $breachData['description'] ?? '',
            'affected_data_types' => $breachData['affected_data_types'] ?? [],
            'affected_users_count' => $breachData['affected_users_count'] ?? 0,
            'detected_at' => $breachData['detected_at'] ?? now()->toDateTimeString(),
            'reported_at' => now()->toDateTimeString(),
            'remediation_steps' => $breachData['remediation_steps']
                ?? self::REMEDIATION_STEPS[$breachData['breach_type']] ?? [],
        ]);

        $logPath = storage_path('logs/breach_audit.log');
        $entry = sprintf(
            '[%s] BREACH: type=%s, severity=%s, affected=%d, data_types=%s',
            now()->toDateTimeString(),
            $breachData['breach_type'],
            $breachData['severity'],
            $breachData['affected_users_count'] ?? 0,
            implode(',', $breachData['affected_data_types'] ?? [])
        );

        file_put_contents($logPath, $entry.PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    private function validateBreachData(array $breachData): array
    {
        $required = ['breach_type', 'severity', 'description'];

        foreach ($required as $field) {
            if (empty($breachData[$field])) {
                throw new \InvalidArgumentException("Missing required field: {$field}");
            }
        }

        if (! in_array($breachData['severity'], self::SEVERITY_LEVELS, true)) {
            throw new \InvalidArgumentException(
                "Invalid severity level: {$breachData['severity']}"
            );
        }

        return array_merge([
            'breach_id' => uniqid('breach_', true),
            'affected_data_types' => [],
            'affected_user_ids' => [],
            'affected_users_count' => 0,
            'detected_at' => now()->toDateTimeString(),
            'remediation_steps' => self::REMEDIATION_STEPS[$breachData['breach_type']] ?? [],
        ], $breachData);
    }

    private function buildAdminEmailBody(array $breachData): string
    {
        $severity = strtoupper($breachData['severity']);
        $breachType = $breachData['breach_type'];
        $description = $breachData['description'];
        $affectedCount = $breachData['affected_users_count'] ?? 0;
        $dataTypes = implode(', ', $breachData['affected_data_types'] ?? []);
        $detectedAt = $breachData['detected_at'];
        $remediation = $breachData['remediation_steps'] ?? [];

        $remediationList = '';
        foreach ($remediation as $step) {
            $remediationList .= "- {$step}\n";
        }

        return <<<EOT
        SECURITY BREACH ALERT - EasyRyde

        Severity: {$severity}
        Type: {$breachType}
        Detected: {$detectedAt}

        Description:
        {$description}

        Affected Users: {$affectedCount}
        Data Types Affected: {$dataTypes}

        Recommended Remediation Steps:
        {$remediationList}
        Immediate action is required. Please review and respond within 72 hours as required by POPIA.

        This is an automated security alert from the EasyRyde Breach Notification System.
        EOT;
    }

    private function buildUserEmailBody(User $user, string $breachType): string
    {
        $name = $user->name;
        $breachDescription = match ($breachType) {
            'password_reset' => 'A security incident may have exposed your account credentials.',
            'data_exposure' => 'A security incident may have exposed some of your personal information.',
            'unauthorized_access' => 'A security incident involved unauthorized access to systems containing your data.',
            'system_compromise' => 'A security incident affected systems that store your information.',
            default => 'A security incident may have involved your personal data.',
        };

        return <<<EOT
        Dear {$name},

        We are writing to inform you of a security incident that may have affected your personal information on EasyRyde.

        What happened:
        {$breachDescription}

        What we are doing:
        We have taken immediate steps to contain the incident and are working with security experts to investigate. We have also notified the Information Regulator as required by POPIA.

        What you can do:
        - Change your EasyRyde password immediately
        - Enable two-factor authentication if not already active
        - Monitor your account for any suspicious activity
        - Contact us immediately if you notice anything unusual

        We sincerely apologize for this incident and any inconvenience it may cause. Protecting your personal information is our top priority.

        If you have questions, please contact our security team at security@easyryde.co.za.

        EasyRyde Security Team
        EOT;
    }
}
