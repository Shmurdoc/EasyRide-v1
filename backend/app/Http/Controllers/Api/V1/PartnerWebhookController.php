<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Partner\OrderStatusRequest;
use App\Http\Requests\Api\V1\Partner\ReceivePartnerOrderRequest;
use App\Models\Delivery;
use App\Services\PartnerApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PartnerWebhookController extends Controller
{
    public function __construct(
        protected PartnerApiService $partnerService,
    ) {}

    public function receiveOrder(ReceivePartnerOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $delivery = $this->partnerService->receiveOrder($validated);

        if (! $delivery) {
            return response()->json(['message' => 'Invalid webhook or order creation failed.'], 422);
        }

        return response()->json([
            'message' => 'Order received',
            'order_id' => $delivery->id,
            'fare' => $delivery->fare_amount,
        ], 201);
    }

    public function orderStatus(OrderStatusRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $this->partnerService->verifyWebhookSignature($request->all())) {
            Log::warning('Partner status webhook: Invalid signature');

            return response()->json(['message' => 'Invalid signature.'], 403);
        }

        $delivery = Delivery::where('partner_reference', $validated['order_id'])->first();

        if (! $delivery) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        $statusMap = [
            'confirmed' => 'confirmed',
            'preparing' => 'preparing',
            'ready' => 'ready_for_pickup',
            'picked_up' => 'in_transit',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
        ];

        $newStatus = $statusMap[$validated['status']] ?? $validated['status'];

        $delivery->update([
            'status' => $newStatus,
            'delivered_at' => $newStatus === 'delivered' ? now() : null,
        ]);

        return response()->json(['message' => 'Status updated']);
    }
}
