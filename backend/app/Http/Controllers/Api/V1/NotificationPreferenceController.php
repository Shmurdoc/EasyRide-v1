<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'push_enabled' => 'sometimes|boolean',
            'email_enabled' => 'sometimes|boolean',
            'sms_enabled' => 'sometimes|boolean',
            'in_app_enabled' => 'sometimes|boolean',
            'ride_updates' => 'sometimes|boolean',
            'payment_updates' => 'sometimes|boolean',
            'promotions' => 'sometimes|boolean',
            'marketing' => 'sometimes|boolean',
            'security_alerts' => 'sometimes|boolean',
        ]);

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
