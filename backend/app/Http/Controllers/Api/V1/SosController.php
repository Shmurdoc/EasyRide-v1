<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Sos\SosAcknowledgeRequest;
use App\Http\Requests\Api\V1\Sos\SosResolveRequest;
use App\Http\Requests\Api\V1\Sos\SosTriggerRequest;
use App\Models\Ride;
use App\Services\SosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SosController extends Controller
{
    public function __construct(
        protected SosService $sosService,
    ) {}

    public function trigger(SosTriggerRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $ride = isset($validated['ride_id']) ? Ride::find($validated['ride_id']) : null;

        $alert = $this->sosService->triggerSos(
            $request->user(),
            $ride,
            $validated['latitude'],
            $validated['longitude'],
            $validated['alert_type'] ?? '',
        );

        return response()->json([
            'message' => 'SOS alert triggered. Help is on the way.',
            'alert_id' => $alert->id,
            'cancel_window' => 10,
        ], 201);
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $result = $this->sosService->cancelSos($request->user(), $id);

        if (! $result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function acknowledge(SosAcknowledgeRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->sosService->acknowledgeAlert($request->user(), $id, $validated['notes'] ?? '');

        if (! $result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function resolve(SosResolveRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->sosService->resolveAlert($request->user(), $id, $validated['resolution']);

        if (! $result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function active(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $alerts = $this->sosService->getActiveAlerts();

        return response()->json(['data' => iterator_to_array($alerts)]);
    }
}
