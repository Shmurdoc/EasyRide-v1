<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AdminAuditLog;
use App\Models\DriverViolation;
use App\Models\User;
use App\Services\DriverFraudGuardService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverViolationController extends Controller
{
    public function __construct(
        protected DriverFraudGuardService $fraudGuardService,
        protected WalletService $walletService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = DriverViolation::query()
            ->with(['driver', 'rider', 'ride'])
            ->when($request->user()->tenant_id, fn ($q, $v) => $q->where('tenant_id', $v))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->driver_id, fn ($q, $v) => $q->where('driver_id', $v))
            ->when($request->violation_type, fn ($q, $v) => $q->where('violation_type', $v))
            ->latest();

        return ApiResponse::paginated($query->paginate(min((int) ($request->per_page ?? 15), 100)));
    }

    public function show(Request $request, DriverViolation $violation): JsonResponse
    {
        if ($request->user()->tenant_id && $violation->tenant_id !== $request->user()->tenant_id) {
            return ApiResponse::forbidden();
        }

        return ApiResponse::success($violation->load(['driver', 'rider', 'ride']));
    }

    public function myViolations(Request $request): JsonResponse
    {
        $violations = DriverViolation::where('driver_id', $request->user()->id)
            ->latest()
            ->get();

        return ApiResponse::success($violations);
    }

    public function pay(Request $request, DriverViolation $violation): JsonResponse
    {
        if ($violation->driver_id !== $request->user()->id) {
            return ApiResponse::forbidden();
        }

        if ($violation->status !== DriverViolation::STATUS_PENDING) {
            return ApiResponse::apiError(422, 'Not Payable', 'Violation is not in a payable state.');
        }

        try {
            $paid = $this->fraudGuardService->applyFine($violation->fresh());

            if (! $paid) {
                return ApiResponse::apiError(422, 'Payment Failed', 'Insufficient wallet balance to settle this fine.');
            }

            return ApiResponse::success($violation->fresh());
        } catch (\RuntimeException $e) {
            return ApiResponse::apiError(422, 'Payment Failed', $e->getMessage());
        }
    }

    public function waive(Request $request, DriverViolation $violation): JsonResponse
    {
        $violation->update([
            'status' => DriverViolation::STATUS_WAIVED,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        $this->audit($request, $violation, 'waive');

        return ApiResponse::success($violation->fresh());
    }

    public function resolveDispute(Request $request, DriverViolation $violation): JsonResponse
    {
        $validated = $request->validate([
            'decision' => 'required|string|in:uphold,waive',
        ]);

        $violation->update([
            'status' => $validated['decision'] === 'waive'
                ? DriverViolation::STATUS_WAIVED
                : DriverViolation::STATUS_PENDING,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        $this->audit($request, $violation, "dispute_{$validated['decision']}");

        return ApiResponse::success($violation->fresh());
    }

    private function audit(Request $request, DriverViolation $violation, string $action): void
    {
        AdminAuditLog::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => 'driver_violation',
            'resource_id' => $violation->id,
            'new_values' => $violation->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}