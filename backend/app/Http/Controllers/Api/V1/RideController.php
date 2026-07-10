<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\RideStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Ride\FareEstimateRequest;
use App\Http\Requests\Api\V1\Ride\RideApplyPromoRequest;
use App\Http\Requests\Api\V1\Ride\RideCancelRequest;
use App\Http\Requests\Api\V1\Ride\RideCreateRequest;
use App\Http\Requests\Api\V1\Ride\RideRateRequest;
use App\Http\Requests\Api\V1\Ride\UpdateLocationRequest;
use App\Http\Resources\RideResource;
use App\Models\Ride;
use App\Services\FareCalculationService;
use App\Services\PromoCodeService;
use App\Services\ReceiptService;
use App\Services\RideService;
use App\Services\RouteService;
use App\Services\SurgePricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RideController extends Controller
{
    public function __construct(
        protected RideService $rideService,
        protected FareCalculationService $fareCalculationService,
        protected RouteService $routeService,
        protected PromoCodeService $promoCodeService,
        protected ReceiptService $receiptService,
        protected SurgePricingService $surgePricingService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $rides = Ride::query()
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->category, fn ($q, $v) => $q->where('category', $v))
            ->when($request->from_date, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to_date, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->user()->role === 'rider', fn ($q) => $q->where('rider_id', $request->user()->id))
            ->when($request->user()->role === 'driver', fn ($q) => $q->where('driver_id', $request->user()->id))
            ->with(['rider', 'driver', 'payment'])
            ->latest()
            ->paginate($request->per_page ?? 15);

        return RideResource::collection($rides);
    }

    public function store(RideCreateRequest $request): JsonResponse
    {
        try {
            $ride = $this->rideService->createRide($request->user(), $request->validated());

            return response()->json(['ride' => new RideResource($ride->load('rider'))], 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(
            new RideResource($ride->load([
                'rider',
                'driver',
                'driver.driverProfile',
                'driver.vehicle',
                'payment',
                'rating',
                'delivery',
            ]))
        );
    }

    public function cancel(RideCancelRequest $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $validated = $request->validated();

            $cancelledRide = $this->rideService->cancelRide(
                $ride,
                $validated['cancellation_reason'],
                (string) $request->user()->id,
            );

            return response()->json(new RideResource($cancelledRide));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function rate(RideRateRequest $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id) {
            return response()->json(['message' => 'Only the rider can rate.'], 403);
        }

        try {
            $validated = $request->validated();

            $ratedRide = $this->rideService->rateRide(
                $ride,
                $validated['score'],
                $validated['comment'] ?? null,
            );

            return response()->json(new RideResource($ratedRide), 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function applyPromo(RideApplyPromoRequest $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $status = $ride->status instanceof RideStatus ? $ride->status->value : $ride->status;
        if ($status !== RideStatus::SEARCHING->value) {
            return response()->json(['message' => 'Promo code cannot be applied at this stage.'], 422);
        }

        try {
            $validated = $request->validated();

            $promo = $this->promoCodeService->validateCode(
                $validated['code'],
                $request->user()->tenant_id,
                null,
                $request->user()->id,
            );

            $discount = $this->promoCodeService->applyDiscount($promo, (float) $ride->total_fare);

            $ride->update([
                'promo_code_id' => $promo->id,
                'discount_amount' => $discount['discount'],
            ]);

            $this->promoCodeService->incrementUsage($promo, $request->user()->id);

            return response()->json([
                'promo_code' => $promo,
                'discount' => $discount,
                'new_total' => round((float) $ride->total_fare - $discount['discount'], 2),
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function driverAccept(Request $request, Ride $ride): JsonResponse
    {
        try {
            $acceptedRide = $this->rideService->acceptRide($ride, $request->user());

            return response()->json(
                new RideResource($acceptedRide->load(['driver', 'driver.driverProfile', 'driver.vehicle']))
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function driverArrived(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $arrivedRide = $this->rideService->driverArrived($ride);

            return response()->json(new RideResource($arrivedRide));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function startRide(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $startedRide = $this->rideService->startRide($ride);

            return response()->json(new RideResource($startedRide));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function completeRide(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $completedRide = $this->rideService->completeRide(
                $ride,
                (float) $request->input('distance_km', $ride->distance_km),
                (float) $request->input('duration_minutes', $ride->duration_minutes),
            );

            return response()->json([
                'ride' => new RideResource($completedRide->load('payment')),
                'rating_required' => true,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function receipt(Request $request, Ride $ride)
    {
        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            abort(403, 'Unauthorized.');
        }

        if ($ride->status !== 'completed') {
            abort(422, 'Ride is not completed.');
        }

        $path = $this->receiptService->generateReceipt($ride);
        $fullPath = storage_path('app/public/'.$path);

        return response()->file($fullPath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="receipt_'.$ride->id.'.pdf"',
        ]);
    }

    public function updateLocation(UpdateLocationRequest $request, Ride $ride): JsonResponse
    {
        try {
            $this->rideService->updateDriverLocation(
                $request->user(),
                (float) $request->validated('latitude'),
                (float) $request->validated('longitude'),
            );

            return response()->json(['message' => 'Location updated.']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function markNoShow(Request $request, string $rideId): JsonResponse
    {
        $ride = Ride::findOrFail($rideId);

        try {
            $noShowRide = $this->rideService->markNoShow($ride, (string) $request->user()->id);

            return response()->json(new RideResource($noShowRide));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function fareEstimate(FareEstimateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $pickupLat = (float) $validated['pickup_lat'];
        $pickupLng = (float) $validated['pickup_lng'];

        $route = $this->routeService->getRoute(
            $pickupLat,
            $pickupLng,
            (float) $validated['dropoff_lat'],
            (float) $validated['dropoff_lng'],
        );

        $category = $validated['category'] ?? 'standard';
        $tenantId = $request->user()?->tenant_id;
        $surgeBreakdown = $this->surgePricingService->getSurgeBreakdown($pickupLat, $pickupLng, $category, $tenantId);

        $fare = $this->fareCalculationService->calculateFare(
            $route['distance_km'],
            $route['duration_minutes'],
            $category,
            $surgeBreakdown['combined_multiplier'],
        );

        return response()->json([
            'distance_km' => $route['distance_km'],
            'duration_minutes' => $route['duration_minutes'],
            'breakdown' => [
                'base_fare' => $fare['base_fare'],
                'distance_fare' => $fare['distance_fare'],
                'time_fare' => $fare['time_fare'],
                'surge' => $surgeBreakdown['combined_multiplier'],
                'surge_breakdown' => $surgeBreakdown,
                'subtotal' => $fare['subtotal'],
                'total_fare' => $fare['total_fare'],
            ],
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $ride = $this->rideService->getCurrentRideForUser($request->user());

        if (! $ride) {
            return response()->json(['message' => 'No active ride.'], 404);
        }

        return response()->json(
            new RideResource($ride->load([
                'rider',
                'driver',
                'driver.driverProfile',
                'driver.vehicle',
                'payment',
            ]))
        );
    }

    public function track(Request $request, Ride $ride): JsonResponse
    {
        if ($ride->rider_id !== $request->user()->id && $ride->driver_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        try {
            $trackingData = $this->rideService->trackRide($ride);

            return response()->json($trackingData);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function nearby(Request $request): JsonResponse
    {
        $latitude = $request->input('lat');
        $longitude = $request->input('lng');
        $radius = (float) ($request->input('radius', 10));

        if (! $latitude || ! $longitude) {
            return response()->json(['message' => 'Latitude and longitude are required.'], 422);
        }

        $drivers = $this->rideService->findNearbyDrivers(
            (float) $latitude,
            (float) $longitude,
            $radius,
        );

        return response()->json([
            'drivers' => $drivers,
            'count' => $drivers->count(),
        ]);
    }
}
