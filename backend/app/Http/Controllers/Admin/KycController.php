<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Kyc\KycRejectRequest;
use App\Models\KycVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KycController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = KycVerification::with('user')
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->document_type, fn ($q, $v) => $q->where('document_type', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest();

        $verifications = $query->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($verifications);
    }

    public function show(KycVerification $verification): JsonResponse
    {
        $verification->load(['user.driverProfile', 'user.vehicle', 'verifier']);

        return response()->json(['verification' => $verification]);
    }

    public function approve(KycVerification $verification): JsonResponse
    {
        if ($verification->status === KycVerification::STATUS_APPROVED) {
            return response()->json(['message' => 'Already approved.'], 422);
        }

        $verification->approve(request()->user()->id);

        return response()->json(['message' => 'Verification approved.']);
    }

    public function reject(KycRejectRequest $request, KycVerification $verification): JsonResponse
    {
        if ($verification->status === KycVerification::STATUS_APPROVED) {
            return response()->json(['message' => 'Cannot reject an approved verification.'], 422);
        }

        $verification->reject($request->validated()['reason'], $request->user()->id);

        return response()->json(['message' => 'Verification rejected.']);
    }

    public function bulkApprove(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:50',
            'ids.*' => 'string|exists:kyc_verifications,id',
        ]);

        $adminId = $request->user()->id;
        $approved = 0;

        foreach ($validated['ids'] as $id) {
            $verification = KycVerification::find($id);
            if ($verification && $verification->status === KycVerification::STATUS_PENDING) {
                $verification->approve($adminId);
                $approved++;
            }
        }

        return response()->json([
            'message' => "{$approved} verification(s) approved.",
            'approved_count' => $approved,
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $pending = KycVerification::where('status', KycVerification::STATUS_PENDING)->count();

        $approvedToday = KycVerification::where('status', KycVerification::STATUS_APPROVED)
            ->whereDate('verified_at', today())
            ->count();

        $rejectedToday = KycVerification::where('status', KycVerification::STATUS_REJECTED)
            ->whereDate('updated_at', today())
            ->count();

        $avgReviewTime = KycVerification::whereNotNull('verified_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, verified_at)) as avg_minutes')
            ->value('avg_minutes');

        return response()->json([
            'pending' => $pending,
            'approved_today' => $approvedToday,
            'rejected_today' => $rejectedToday,
            'avg_review_minutes' => $avgReviewTime ? round($avgReviewTime, 1) : null,
        ]);
    }
}
