<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PhbimhIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PhbimhWebhookController extends Controller
{
    public function __construct(
        protected PhbimhIntegrationService $phbimhService,
    ) {}

    public function handleWebhook(Request $request): JsonResponse
    {
        $signature = $request->header('X-PHBIMH-Signature', '');

        if (! $signature) {
            Log::warning('PHBIMH webhook missing signature');

            return response()->json(['message' => 'Missing signature'], 400);
        }

        $payload = $request->all();

        if (! $this->phbimhService->verifyWebhookSignature($payload, $signature)) {
            Log::warning('PHBIMH webhook invalid signature', [
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $eventType = $request->header('X-PHBIMH-Event', '');

        if (! $eventType) {
            Log::warning('PHBIMH webhook missing event type');

            return response()->json(['message' => 'Missing event type'], 422);
        }

        try {
            $this->phbimhService->processWebhook($eventType, $payload);
        } catch (\Exception $e) {
            Log::error('PHBIMH webhook processing failed', [
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Webhook processing failed'], 422);
        }

        return response()->json(['message' => 'Webhook processed']);
    }
}
