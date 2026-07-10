<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\InAppNotification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class NotificationService
{
    private const DEDUP_TTL = 3600;

    public function __construct(
        protected PushNotificationService $pushService,
        protected EmailService $emailService,
        protected SmsService $smsService,
    ) {}

    public function notify(User $user, string $title, string $body, array $options = []): void
    {
        $dedupKey = $this->buildDedupKey($title, $user->id, $options);

        if ($this->isDuplicate($dedupKey)) {
            Log::info('Duplicate notification suppressed', [
                'user_id' => $user->id,
                'title' => $title,
                'dedup_key' => $dedupKey,
            ]);

            return;
        }

        $preferences = $this->getUserPreferences($user->id);
        $category = $options['category'] ?? 'general';

        if (isset($options['in_app']) && $options['in_app'] !== false) {
            if ($preferences['in_app_enabled'] && $this->categoryAllowed($preferences, $category)) {
                $this->createInAppNotification($user, $title, $body, $options);
            }
        }

        if (isset($options['push']) && $options['push'] !== false) {
            if ($preferences['push_enabled'] && $this->categoryAllowed($preferences, $category)) {
                $this->pushService->sendToDevice($user, [
                    'title' => $title,
                    'body' => $body,
                    'channel' => $options['channel'] ?? 'easyryde_default',
                ], $options['data'] ?? []);
            }
        }

        if (isset($options['email']) && $options['email'] !== false) {
            if ($preferences['email_enabled'] && $this->categoryAllowed($preferences, $category)) {
                $this->emailService->send($user->email, $title, $this->buildEmailHtml($title, $body));
            }
        }

        if (isset($options['sms']) && $options['sms'] !== false && $user->phone_number) {
            if ($preferences['sms_enabled'] && $this->categoryAllowed($preferences, $category)) {
                $this->smsService->send($user->phone_number, "{$title}: {$body}");
            }
        }

        $this->markAsSent($dedupKey);
    }

    public function notifyAdmins(string $title, string $body, array $options = []): void
    {
        $admins = User::role('admin')->get();
        foreach ($admins as $admin) {
            $this->notify($admin, $title, $body, $options);
        }
    }

    public function notifyRole(string $role, string $title, string $body, array $options = []): void
    {
        $users = User::role($role)->get();
        foreach ($users as $user) {
            $this->notify($user, $title, $body, $options);
        }
    }

    public function broadcast(string $title, string $body, array $options = []): void
    {
        $this->pushService->sendToRole('rider', [
            'title' => $title,
            'body' => $body,
            'channel' => $options['channel'] ?? 'easyryde_broadcast',
        ], $options['data'] ?? []);
    }

    private function buildDedupKey(string $title, string $userId, array $options): string
    {
        $rideId = $options['data']['ride_id'] ?? $options['ride_id'] ?? 'none';
        $hour = now()->format('Y-m-d-H');

        return "notification:dedup:{$title}:{$userId}:{$rideId}:{$hour}";
    }

    private function isDuplicate(string $key): bool
    {
        try {
            return (bool) Redis::get($key);
        } catch (\Exception $e) {
            Log::warning('Redis dedup check failed, allowing notification', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function markAsSent(string $key): void
    {
        try {
            Redis::setex($key, self::DEDUP_TTL, '1');
        } catch (\Exception $e) {
            Log::warning('Redis dedup set failed', ['error' => $e->getMessage()]);
        }
    }

    private function createInAppNotification(User $user, string $title, string $body, array $options): void
    {
        try {
            InAppNotification::create([
                'user_id' => $user->id,
                'title' => $title,
                'body' => $body,
                'type' => $options['type'] ?? 'info',
                'data' => $options['data'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create in-app notification', ['error' => $e->getMessage()]);
        }
    }

    private function buildEmailHtml(string $title, string $body): string
    {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>
            <div style='background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;'>
                <h1 style='margin:0;font-size:24px;'>EasyRyde</h1>
            </div>
            <div style='background:white;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;'>
                <h2>{$title}</h2>
                <p>{$body}</p>
            </div>
        </div>";
    }

    private function getUserPreferences(string $userId): array
    {
        try {
            $pref = NotificationPreference::where('user_id', $userId)->first();
            if ($pref) {
                return [
                    'push_enabled' => $pref->push_enabled,
                    'email_enabled' => $pref->email_enabled,
                    'sms_enabled' => $pref->sms_enabled,
                    'in_app_enabled' => $pref->in_app_enabled,
                    'ride_updates' => $pref->ride_updates,
                    'payment_updates' => $pref->payment_updates,
                    'promotions' => $pref->promotions,
                    'marketing' => $pref->marketing,
                    'security_alerts' => $pref->security_alerts,
                ];
            }
        } catch (\Exception $e) {
            Log::warning('Failed to load notification preferences', ['user_id' => $userId, 'error' => $e->getMessage()]);
        }

        return [
            'push_enabled' => true,
            'email_enabled' => true,
            'sms_enabled' => true,
            'in_app_enabled' => true,
            'ride_updates' => true,
            'payment_updates' => true,
            'promotions' => true,
            'marketing' => true,
            'security_alerts' => true,
        ];
    }

    private function categoryAllowed(array $preferences, string $category): bool
    {
        return match ($category) {
            'general' => true,
            'ride_update' => $preferences['ride_updates'],
            'payment' => $preferences['payment_updates'],
            'promo', 'marketing' => $preferences['promotions'] && $preferences['marketing'],
            'security' => $preferences['security_alerts'],
            default => false,
        };
    }
}
