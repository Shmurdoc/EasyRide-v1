<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Notification\UpdateNotificationPreferenceRequest;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $preference = NotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            NotificationPreference::defaultsForUser($request->user()->id),
        );

        return response()->json(['data' => $preference]);
    }

    public function update(UpdateNotificationPreferenceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $preference = NotificationPreference::firstOrCreate(
            ['user_id' => $request->user()->id],
            NotificationPreference::defaultsForUser($request->user()->id),
        );

        $preference->update($validated);

        return response()->json([
            'message' => 'Notification preferences updated.',
            'data' => $preference->fresh(),
        ]);
    }
}
