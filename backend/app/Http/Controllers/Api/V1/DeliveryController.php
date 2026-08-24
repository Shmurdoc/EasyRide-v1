<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Delivery\AssignDriverRequest;
use App\Http\Requests\Api\V1\Delivery\CancelDeliveryRequest;
use App\Http\Requests\Api\V1\Delivery\QuoteDeliveryRequest;
use App\Http\Requests\Api\V1\Delivery\UpdateStatusRequest;
use App\Http\Requests\Api\V1\StoreDeliveryRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Delivery;
use App\Models\User;
use App\Services\DeliveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function __construct(
        protected DeliveryService $deliveryService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $deliveries = Delivery::query()
            ->when($request->user()->role === 'driver', fn ($q) => $q->where('driver_id', $request->user()->id))
            ->when($request->user()->role === 'rider', fn ($q) => $q->where('sender_id', $request->user()->id))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->with(['sender', 'driver'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return ApiResponse::paginated($deliveries);
    }

    public function store(StoreDeliveryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $delivery = $this->deliveryService->createDelivery([
            'tenant_id' => $request->user()->tenant_id,
            'sender_id' => $request->user()->id,
            'status' => 'pending',
            'payment_method' => $validated['payment_method'] ?? 'wallet',
            'payment_status' => 'pending',
            'item_description' => $validated['item_description'],
            'item_value' => $validated['item_value'] ?? null,
            'package_weight_kg' => $validated['weight_kg'] ?? 1.0,
            'recipient_name' => $validated['recipient_name'],
            'recipient_phone' => $validated['recipient_phone'],
            'pickup_address' => $validated['pickup_address'],
            'pickup_lat' => $validated['pickup_lat'],
            'pickup_lng' => $validated['pickup_lng'],
            'dropoff_address' => $validated['dropoff_address'],
            'dropoff_lat' => $validated['dropoff_lat'],
            'dropoff_lng' => $validated['dropoff_lng'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['delivery' => $delivery], 201);
    }

    public function quote(QuoteDeliveryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $quote = $this->deliveryService->quoteByCoordinates([
            'tenant_id' => $request->user()->tenant_id,
            'pickup_lat' => $validated['pickup_lat'],
            'pickup_lng' => $validated['pickup_lng'],
            'dropoff_lat' => $validated['dropoff_lat'],
            'dropoff_lng' => $validated['dropoff_lng'],
            'package_weight_kg' => $validated['weight_kg'] ?? 1.0,
        ]);

        return ApiResponse::success(['quote' => $quote]);
    }

    public function driverAccept(Request $request, Delivery $delivery): JsonResponse
    {
        try {
            $delivery = $this->deliveryService->acceptDelivery($delivery, $request->user());

            return ApiResponse::success($delivery);
        } catch (\RuntimeException $e) {
            return ApiResponse::apiError(422, 'Accept Failed', $e->getMessage());
        }
    }

    public function driverCancel(CancelDeliveryRequest $request, Delivery $delivery): JsonResponse
    {
        try {
            $delivery = $this->deliveryService->driverCancelDelivery(
                $delivery,
                $request->user(),
                $request->validated('cancellation_reason') ?? '',
            );

            return ApiResponse::success($delivery);
        } catch (\RuntimeException $e) {
            return ApiResponse::apiError(422, 'Cancellation Failed', $e->getMessage());
        }
    }

    public function availableDeliveries(Request $request): JsonResponse
    {
        $deliveries = $this->deliveryService->getAvailableDeliveries($request->user());

        return ApiResponse::success($deliveries);
    }

    public function show(Request $request, Delivery $delivery): JsonResponse
    {
        $user = $request->user();

        if ($delivery->sender_id !== $user->id
            && $delivery->driver_id !== $user->id
            && ! $user->hasAnyRole(['admin', 'super-admin'])
        ) {
            return ApiResponse::forbidden();
        }

        return response()->json(['delivery' => $delivery->load(['sender', 'driver', 'ride'])]);
    }

    public function updateStatus(UpdateStatusRequest $request, Delivery $delivery): JsonResponse
    {
        $user = $request->user();

        if ($delivery->driver_id !== $user->id
            && ! $user->hasAnyRole(['admin', 'super-admin'])
        ) {
            return ApiResponse::forbidden();
        }

        $validated = $request->validated();

        $delivery = $this->deliveryService->updateStatus(
            $delivery,
            $validated['status'],
            $request->user()->id,
            $validated['reason'] ?? null,
            $validated['pod_photo_url'] ?? null,
        );

        return ApiResponse::success($delivery);
    }

    public function assignDriver(AssignDriverRequest $request, Delivery $delivery): JsonResponse
    {
        $validated = $request->validated();

        $user = User::find($validated['driver_id']);
        $delivery->update(['driver_id' => $user->id, 'status' => 'pending']);

        return ApiResponse::success($delivery->fresh()->load(['sender', 'driver']));
    }

    public function driverDeliveries(Request $request): JsonResponse
    {
        $deliveries = Delivery::where('driver_id', $request->user()->id)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->with(['sender', 'ride'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 15), 100));

        return ApiResponse::paginated($deliveries);
    }
}
