<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\RideStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Chat\ChatSendRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Ride;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        protected ChatService $chatService,
    ) {}

    public function messages(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            return ApiResponse::forbidden();
        }

        $messages = $this->chatService->getMessages(
            $ride,
            min((int) ($request->per_page ?? 50), 100),
            $request->before,
        );

        return ApiResponse::success($messages);
    }

    public function send(ChatSendRequest $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            return ApiResponse::forbidden();
        }

        $status = $ride->status instanceof RideStatus ? $ride->status->value : $ride->status;
        if (! in_array($status, [RideStatus::ACCEPTED->value, RideStatus::ARRIVED->value, RideStatus::IN_PROGRESS->value])) {
            return ApiResponse::apiError(422, 'Invalid Ride Status', 'Chat is only available during active rides.');
        }

        $validated = $request->validated();

        try {
            $message = $this->chatService->sendMessage($ride, $request->user(), $validated['message']);

            return ApiResponse::success($message, 'Message sent.', 201);
        } catch (\Exception $e) {
            return ApiResponse::apiError(422, 'Send Failed', $e->getMessage());
        }
    }

    public function unread(Request $request, Ride $ride): JsonResponse
    {
        $count = $this->chatService->getUnreadCount($ride, $request->user());

        return response()->json(['unread_count' => $count]);
    }

    public function markRead(Request $request, Ride $ride): JsonResponse
    {
        $this->chatService->markAsRead($ride, $request->user());

        return ApiResponse::success(null, 'Messages marked as read.');
    }
}
