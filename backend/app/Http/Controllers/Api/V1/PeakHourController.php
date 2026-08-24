<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\StorePeakHourRequest;
use App\Http\Requests\Api\V1\Admin\UpdatePeakHourRequest;
use App\Models\AdminAuditLog;
use App\Models\PeakHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeakHourController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $peakHours = PeakHour::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($request->day_of_week, fn ($q, $v) => $q->where('day_of_week', $v))
            ->when($request->is_active !== null, fn ($q, $v) => $q->where('is_active', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($peakHours);
    }

    public function store(StorePeakHourRequest $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $peakHour = PeakHour::create([
            'tenant_id' => $tenantId,
            'name' => $request->name,
            'day_of_week' => $request->day_of_week,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'multiplier' => $request->multiplier,
        ]);

        $this->logActivity($request, $peakHour, 'created');

        return response()->json([
            'success' => true,
            'message' => 'Peak hour created successfully.',
            'data' => $peakHour,
        ], 201);
    }

    public function show(Request $request, PeakHour $peakHour): JsonResponse
    {
        if ($request->user()->tenant_id && $peakHour->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $peakHour,
        ]);
    }

    public function update(UpdatePeakHourRequest $request, PeakHour $peakHour): JsonResponse
    {
        if ($request->user()->tenant_id && $peakHour->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $oldValues = $peakHour->toArray();

        $peakHour->update($request->only([
            'name', 'day_of_week', 'start_time', 'end_time', 'multiplier',
        ]));

        $this->logActivity($request, $peakHour, 'updated', $oldValues);

        return response()->json([
            'success' => true,
            'message' => 'Peak hour updated successfully.',
            'data' => $peakHour,
        ]);
    }

    public function destroy(Request $request, PeakHour $peakHour): JsonResponse
    {
        if ($request->user()->tenant_id && $peakHour->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $oldValues = $peakHour->toArray();

        $peakHour->delete();

        $this->logActivity($request, $peakHour, 'deleted', $oldValues);

        return response()->json([
            'success' => true,
            'message' => 'Peak hour deleted successfully.',
        ]);
    }

    public function toggle(Request $request, PeakHour $peakHour): JsonResponse
    {
        if ($request->user()->tenant_id && $peakHour->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $oldValues = $peakHour->toArray();

        $peakHour->update([
            'is_active' => ! $peakHour->is_active,
        ]);

        $action = $peakHour->is_active ? 'activated' : 'deactivated';
        $this->logActivity($request, $peakHour, $action, $oldValues);

        return response()->json([
            'success' => true,
            'message' => 'Peak hour status toggled successfully.',
            'data' => $peakHour,
        ]);
    }

    private function logActivity(Request $request, PeakHour $peakHour, string $action, array $oldValues = null): void
    {
        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => 'peak_hour',
            'resource_id' => $peakHour->id,
            'old_values' => $oldValues,
            'new_values' => $peakHour->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
