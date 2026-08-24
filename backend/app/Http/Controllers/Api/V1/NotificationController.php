<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Notification\RegisterTokenRequest;
use App\Http\Requests\Api\V1\Notification\UnregisterTokenRequest;
use App\Models\InAppNotification;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = InAppNotification::where('user_id', $request->user()->id)
            ->when($request->unread_only === 'true', fn ($q) => $q->unread())
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 20), 100));

        $unreadCount = InAppNotification::where('user_id', $request->user()->id)
            ->unread()
            ->count();

        return response()->json([
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    public function markAsRead(Request $request, InAppNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        InAppNotification::where('user_id', $request->user()->id)
            ->unread()
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function registerToken(RegisterTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $pushService = app(PushNotificationService::class);
        $pushService->registerToken($request->user(), $validated['token'], $validated['device_type']);

        return response()->json(['message' => 'Push token registered.']);
    }

    public function unregisterToken(UnregisterTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $pushService = app(PushNotificationService::class);
        $pushService->deactivateToken($validated['token']);

        return response()->json(['message' => 'Push token unregistered.']);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = InAppNotification::where('user_id', $request->user()->id)
            ->unread()
            ->count();

        return response()->json(['unread_count' => $count]);
    }
}
