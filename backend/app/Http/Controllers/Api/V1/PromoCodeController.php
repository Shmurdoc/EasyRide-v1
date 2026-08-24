<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Promo\PromoCodeCreateRequest;
use App\Http\Requests\Api\V1\Promo\PromoCodeUpdateRequest;
use App\Http\Requests\Api\V1\Promo\ValidateCodeRequest;
use App\Models\PromoCode;
use App\Services\PromoCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromoCodeController extends Controller
{
    public function __construct(
        protected PromoCodeService $promoCodeService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $promoCodes = PromoCode::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->when($request->tenant_id && $request->user()->hasAnyRole(['admin', 'super-admin']), fn ($q, $v) => $q->where('tenant_id', $request->tenant_id))
            ->when($request->is_active, fn ($q, $v) => $q->where('is_active', filter_var($v, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->search, fn ($q, $v) => $q->where('code', 'like', "%{$v}%"))
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return response()->json($promoCodes);
    }

    public function store(PromoCodeCreateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $promoCode = PromoCode::create([
            'tenant_id' => $request->user()->tenant_id,
            ...$validated,
        ]);

        return response()->json($promoCode, 201);
    }

    public function show(Request $request, PromoCode $promoCode): JsonResponse
    {
        if ($promoCode->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json($promoCode->load('tenant'));
    }

    public function update(PromoCodeUpdateRequest $request, PromoCode $promoCode): JsonResponse
    {
        if ($promoCode->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validated();

        $promoCode->update($validated);

        return response()->json($promoCode);
    }

    public function destroy(Request $request, PromoCode $promoCode): JsonResponse
    {
        if ($promoCode->tenant_id !== $request->user()->tenant_id && ! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $promoCode->delete();

        return response()->json(null, 204);
    }

    public function validateCode(ValidateCodeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $promo = $this->promoCodeService->validateCode(
                $validated['code'],
                $request->user()->tenant_id,
                $validated['ride_amount'] ?? null,
            );

            $discount = $this->promoCodeService->applyDiscount($promo, $validated['ride_amount'] ?? 0);

            return response()->json([
                'valid' => true,
                'promo_code' => $promo,
                'discount' => $discount,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'valid' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
