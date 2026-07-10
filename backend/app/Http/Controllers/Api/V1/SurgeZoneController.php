<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\StoreSurgeZoneRequest;
use App\Http\Requests\Api\V1\Admin\UpdateSurgeZoneRequest;
use App\Models\AdminAuditLog;
use App\Models\SurgeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SurgeZoneController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $surgeZones = SurgeZone::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($request->is_active !== null, fn ($q, $v) => $q->where('is_active', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->latest()
            ->paginate($request->per_page ?? 15);

        return response()->json($surgeZones);
    }

    public function store(StoreSurgeZoneRequest $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $surgeZone = SurgeZone::create([
            'tenant_id' => $tenantId,
            'name' => $request->name,
            'center_lat' => $request->center_lat,
            'center_lng' => $request->center_lng,
            'radius_meters' => $request->radius_meters,
            'multiplier' => $request->multiplier,
        ]);

        $this->logActivity($request, $surgeZone, 'created');

        return response()->json([
            'success' => true,
            'message' => 'Surge zone created successfully.',
            'data' => $surgeZone,
        ], 201);
    }

    public function show(Request $request, SurgeZone $surgeZone): JsonResponse
    {
        if ($request->user()->tenant_id && $surgeZone->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $surgeZone,
        ]);
    }

    public function update(UpdateSurgeZoneRequest $request, SurgeZone $surgeZone): JsonResponse
    {
        if ($request->user()->tenant_id && $surgeZone->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $oldValues = $surgeZone->toArray();

        $surgeZone->update($request->only([
            'name', 'center_lat', 'center_lng', 'radius_meters', 'multiplier',
        ]));

        $this->logActivity($request, $surgeZone, 'updated', $oldValues);

        return response()->json([
            'success' => true,
            'message' => 'Surge zone updated successfully.',
            'data' => $surgeZone,
        ]);
    }

    public function destroy(Request $request, SurgeZone $surgeZone): JsonResponse
    {
        if ($request->user()->tenant_id && $surgeZone->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $oldValues = $surgeZone->toArray();

        $surgeZone->delete();

        $this->logActivity($request, $surgeZone, 'deleted', $oldValues);

        return response()->json([
            'success' => true,
            'message' => 'Surge zone deleted successfully.',
        ]);
    }

    public function toggle(Request $request, SurgeZone $surgeZone): JsonResponse
    {
        if ($request->user()->tenant_id && $surgeZone->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $oldValues = $surgeZone->toArray();

        $surgeZone->update([
            'is_active' => ! $surgeZone->is_active,
        ]);

        $action = $surgeZone->is_active ? 'activated' : 'deactivated';
        $this->logActivity($request, $surgeZone, $action, $oldValues);

        return response()->json([
            'success' => true,
            'message' => 'Surge zone status toggled successfully.',
            'data' => $surgeZone,
        ]);
    }

    private function logActivity(Request $request, SurgeZone $surgeZone, string $action, array $oldValues = null): void
    {
        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => 'surge_zone',
            'resource_id' => $surgeZone->id,
            'old_values' => $oldValues,
            'new_values' => $surgeZone->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
