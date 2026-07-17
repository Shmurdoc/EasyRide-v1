<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\SendAdminNotificationRequest;
use App\Models\AdminNotification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = AdminNotification::query()
            ->latest()
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    }

    public function send(SendAdminNotificationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $adminNotification = AdminNotification::create([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'type' => $validated['type'],
            'audience' => $validated['audience'],
            'user_id' => $validated['user_id'] ?? null,
            'status' => 'sending',
            'sent_count' => 0,
            'failed_count' => 0,
            'tenant_id' => $request->user()->tenant_id,
        ]);

        $this->dispatchBroadcast($adminNotification, $validated);

        return response()->json([
            'message' => 'Notification queued for delivery.',
            'notification_id' => $adminNotification->id,
        ], 202);
    }

    private function dispatchBroadcast(AdminNotification $adminNotification, array $validated): void
    {
        $title = $validated['title'];
        $body = $validated['body'];
        $type = $validated['type'];
        $audience = $validated['audience'];

        try {
            $notificationService = app(NotificationService::class);
            $options = ['type' => $type];

            switch ($audience) {
                case 'all':
                    $users = User::query()->where('is_active', true)->get();
                    $sent = 0;
                    $failed = 0;
                    foreach ($users as $user) {
                        try {
                            $notificationService->notify($user, $title, $body, $options);
                            $sent++;
                        } catch (\Throwable) {
                            $failed++;
                        }
                    }
                    $adminNotification->update(['sent_count' => $sent, 'failed_count' => $failed, 'status' => 'sent', 'sent_at' => now()]);
                    break;

                case 'riders':
                    $users = User::query()->where('is_active', true)->where('role', 'rider')->get();
                    $sent = 0;
                    $failed = 0;
                    foreach ($users as $user) {
                        try {
                            $notificationService->notify($user, $title, $body, $options);
                            $sent++;
                        } catch (\Throwable) {
                            $failed++;
                        }
                    }
                    $adminNotification->update(['sent_count' => $sent, 'failed_count' => $failed, 'status' => 'sent', 'sent_at' => now()]);
                    break;

                case 'drivers':
                    $users = User::query()->where('is_active', true)->where('role', 'driver')->get();
                    $sent = 0;
                    $failed = 0;
                    foreach ($users as $user) {
                        try {
                            $notificationService->notify($user, $title, $body, $options);
                            $sent++;
                        } catch (\Throwable) {
                            $failed++;
                        }
                    }
                    $adminNotification->update(['sent_count' => $sent, 'failed_count' => $failed, 'status' => 'sent', 'sent_at' => now()]);
                    break;

                case 'user':
                    $userId = $validated['user_id'];
                    $user = User::find($userId);
                    if ($user) {
                        $notificationService->notify($user, $title, $body, $options);
                        $adminNotification->update(['sent_count' => 1, 'failed_count' => 0, 'status' => 'sent', 'sent_at' => now()]);
                    } else {
                        $adminNotification->update(['status' => 'failed', 'failed_count' => 1]);
                    }
                    break;
            }
        } catch (\Throwable) {
            $adminNotification->update(['status' => 'failed']);
        }
    }
}
