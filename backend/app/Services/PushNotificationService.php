<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private const FCM_URL = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';

    private const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    private ?string $projectId = null;

    private ?string $serviceAccountPath = null;

    public function __construct(
        ?string $projectId = null,
        ?string $serviceAccountPath = null,
    ) {
        $this->projectId = $projectId ?? config('services.fcm.project_id');
        $this->serviceAccountPath = $serviceAccountPath ?? config('services.fcm.service_account_path');
    }

    public function sendToDevice(User $user, array $notification, array $data = []): array
    {
        $tokens = PushToken::where('user_id', $user->id)
            ->where('is_active', true)
            ->get();

        if ($tokens->isEmpty()) {
            return ['success' => false, 'message' => 'No push tokens registered'];
        }

        $results = [];
        foreach ($tokens as $token) {
            $result = $this->sendToToken($token, $notification, $data);
            $results[] = $result;

            if (! $result['success'] && in_array($result['error'] ?? '', ['NotRegistered', 'InvalidRegistration', 'MismatchedSenderId'])) {
                $token->update(['is_active' => false]);
            }
        }

        return [
            'success' => true,
            'sent' => count(array_filter($results, fn ($r) => $r['success'])),
            'failed' => count(array_filter($results, fn ($r) => ! $r['success'])),
        ];
    }

    public function sendToToken(PushToken $token, array $notification, array $data = []): array
    {
        try {
            $accessToken = $this->getAccessToken();
            $url = sprintf(self::FCM_URL, $this->projectId);

            $payload = [
                'message' => [
                    'token' => $token->token,
                    'notification' => [
                        'title' => $notification['title'] ?? 'EasyRyde',
                        'body' => $notification['body'] ?? '',
                    ],
                    'data' => array_map('strval', $data),
                    'android' => [
                        'priority' => 'high',
                        'notification' => [
                            'channel_id' => $notification['channel'] ?? 'easyryde_default',
                            'sound' => 'default',
                        ],
                    ],
                    'apns' => [
                        'headers' => ['apns-priority' => '10'],
                        'payload' => [
                            'aps' => [
                                'sound' => 'default',
                                'badge' => $data['badge'] ?? 1,
                            ],
                        ],
                    ],
                ],
            ];

            $response = Http::withToken($accessToken)
                ->post($url, $payload);

            if ($response->successful()) {
                return ['success' => true];
            }

            $body = $response->json();
            $error = $body['error']['message'] ?? 'Unknown error';

            Log::warning('FCM push failed', [
                'token_id' => $token->id,
                'error' => $error,
            ]);

            return ['success' => false, 'error' => $error];
        } catch (\Exception $e) {
            Log::error('FCM push exception', [
                'token_id' => $token->id,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function sendToMultipleUsers(array $userIds, array $notification, array $data = []): array
    {
        $tokens = PushToken::whereIn('user_id', $userIds)
            ->where('is_active', true)
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($tokens as $token) {
            $result = $this->sendToToken($token, $notification, $data);
            if ($result['success']) {
                $sent++;
            } else {
                $failed++;
                if (in_array($result['error'] ?? '', ['NotRegistered', 'InvalidRegistration'])) {
                    $token->update(['is_active' => false]);
                }
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }

    public function sendToRole(string $role, array $notification, array $data = []): array
    {
        $userIds = User::role($role)->pluck('id')->toArray();

        return $this->sendToMultipleUsers($userIds, $notification, $data);
    }

    public function send(User $user, string $title, string $body, array $data = []): array
    {
        return $this->sendToDevice($user, [
            'title' => $title,
            'body' => $body,
        ], $data);
    }

    public function registerToken(User $user, string $token, string $platform = 'android'): PushToken
    {
        return PushToken::updateOrCreate(
            ['token' => $token],
            [
                'user_id' => $user->id,
                'platform' => $platform,
                'is_active' => true,
                'last_used_at' => now(),
            ]
        );
    }

    public function deactivateToken(string $token): bool
    {
        return PushToken::where('token', $token)->update(['is_active' => false]) > 0;
    }

    private function getAccessToken(): string
    {
        $serviceAccount = json_decode(file_get_contents($this->serviceAccountPath), true);

        $now = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode([
            'iss' => $serviceAccount['client_email'],
            'scope' => self::FCM_SCOPE,
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signatureInput = "$header.$payload";
        openssl_sign($signatureInput, $signature, $serviceAccount['private_key'], 'SHA256');
        $jwt = "$header.$payload.".base64_encode($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        return $response->json('access_token');
    }
}
