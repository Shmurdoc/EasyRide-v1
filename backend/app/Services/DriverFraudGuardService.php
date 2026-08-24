<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Delivery;
use App\Models\DriverViolation;
use App\Models\FoodOrder;
use App\Models\Ride;
use App\Models\RideLocationLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DriverFraudGuardService
{
    public function __construct(
        private readonly SettingService $settingService,
        private readonly WalletService $walletService,
        private readonly RideMatchingService $rideMatchingService,
    ) {}

    /**
     * R1: cancel after pickup — always a violation.
     * R2: cancel near dropoff (accepted..waiting_for_rider, distance <= editable radius) — violation.
     * Returns the created violation or null when no rule fired.
     */
    public function evaluateCancellation(Ride $ride, User $driver, string $reason, ?string $priorStatus = null): ?DriverViolation
    {
        $status = $priorStatus
            ?? ($ride->status instanceof \App\Enums\RideStatus ? $ride->status->value : $ride->status);
        $tenantId = $ride->tenant_id;

        if ($ride->picked_up_at !== null || in_array($status, ['in_progress', 'near_drop_off'], true)) {
            $fine = $this->settingService->getFloat('fraud_fine_cancel_after_pickup', 50.0, $tenantId);

            return $this->createViolation(
                driver: $driver,
                tenantId: $tenantId,
                riderId: $ride->rider_id,
                rideId: $ride->id,
                type: DriverViolation::TYPE_CANCEL_AFTER_PICKUP,
                fine: $fine,
                reason: $reason,
                evidence: [
                    'status' => $status,
                    'picked_up_at' => $ride->picked_up_at,
                    'rule' => 'R1',
                ],
            );
        }

        $prePickupStatuses = ['accepted', 'driver_en_route', 'arrived', 'waiting_for_rider'];
        if (! in_array($status, $prePickupStatuses, true)) {
            return null;
        }

        $radiusKm = $this->settingService->getFloat('fraud_near_dropoff_radius_km', 1.0, $tenantId);
        if ($radiusKm <= 0) {
            return null;
        }

        $distance = $this->distanceToDropoff(
            $this->driverLocation($ride->driver_id, 'ride', $ride->id),
            (float) $ride->dropoff_latitude,
            (float) $ride->dropoff_longitude,
        );

        if ($distance === null || $distance > $radiusKm) {
            return null;
        }

        $fine = $this->settingService->getFloat('fraud_fine_cancel_near_dropoff', 50.0, $tenantId);

        return $this->createViolation(
            driver: $driver,
            tenantId: $tenantId,
            riderId: $ride->rider_id,
            rideId: $ride->id,
            type: DriverViolation::TYPE_CANCEL_NEAR_DROPOFF,
            fine: $fine,
            reason: $reason,
            distanceKm: $distance,
            evidence: [
                'status' => $status,
                'radius_km' => $radiusKm,
                'rule' => 'R2',
            ],
        );
    }

    public function evaluateFoodCancellation(FoodOrder $order, User $driver, string $reason, ?string $priorStatus = null): ?DriverViolation
    {
        $tenantId = $order->tenant_id;
        $status = $priorStatus ?? $order->status;

        if (in_array($status, ['picked_up', 'in_transit'], true) || $order->picked_up_at !== null) {
            $fine = $this->settingService->getFloat('fraud_fine_cancel_after_pickup', 50.0, $tenantId);

            return $this->createViolation(
                driver: $driver,
                tenantId: $tenantId,
                riderId: $order->customer_id,
                foodOrderId: $order->id,
                type: DriverViolation::TYPE_FOOD_CANCEL_AFTER_PICKUP,
                fine: $fine,
                reason: $reason,
                evidence: ['status' => $status, 'rule' => 'R-P1'],
            );
        }

        if (! in_array($status, ['confirmed', 'preparing', 'ready'], true)) {
            return null;
        }

        $radiusKm = $this->settingService->getFloat('fraud_near_dropoff_radius_km', 1.0, $tenantId);
        if ($radiusKm <= 0) {
            return null;
        }

        $distance = $this->distanceToDropoff(
            $this->driverLocation($order->driver_id, 'food', $order->id),
            (float) $order->delivery_latitude,
            (float) $order->delivery_longitude,
        );

        if ($distance === null || $distance > $radiusKm) {
            return null;
        }

        $fine = $this->settingService->getFloat('fraud_fine_cancel_near_dropoff', 50.0, $tenantId);

        return $this->createViolation(
            driver: $driver,
            tenantId: $tenantId,
            riderId: $order->customer_id,
            foodOrderId: $order->id,
            type: DriverViolation::TYPE_FOOD_CANCEL_NEAR_DROPOFF,
            fine: $fine,
            reason: $reason,
            distanceKm: $distance,
            evidence: ['status' => $order->status, 'radius_km' => $radiusKm, 'rule' => 'R-P2'],
        );
    }

    public function evaluateParcelCancellation(Delivery $delivery, User $driver, string $reason, ?string $priorStatus = null): ?DriverViolation
    {
        $tenantId = $delivery->tenant_id;
        $status = $priorStatus ?? $delivery->status;

        if ($delivery->picked_up_at !== null || in_array($status, ['picked_up', 'in_transit'], true)) {
            $fine = $this->settingService->getFloat('fraud_fine_cancel_after_pickup', 50.0, $tenantId);

            return $this->createViolation(
                driver: $driver,
                tenantId: $tenantId,
                riderId: $delivery->sender_id,
                deliveryId: $delivery->id,
                type: DriverViolation::TYPE_PARCEL_CANCEL_AFTER_PICKUP,
                fine: $fine,
                reason: $reason,
                evidence: ['status' => $status, 'rule' => 'R-P1'],
            );
        }

        if (! in_array($status, ['accepted', 'at_pickup'], true)) {
            return null;
        }

        $radiusKm = $this->settingService->getFloat('fraud_near_dropoff_radius_km', 1.0, $tenantId);
        if ($radiusKm <= 0) {
            return null;
        }

        $distance = $this->distanceToDropoff(
            $this->driverLocation($delivery->driver_id, 'parcel', $delivery->id),
            (float) ($delivery->dropoff_lat ?? $delivery->recipient_latitude),
            (float) ($delivery->dropoff_lng ?? $delivery->recipient_longitude),
        );

        if ($distance === null || $distance > $radiusKm) {
            return null;
        }

        $fine = $this->settingService->getFloat('fraud_fine_cancel_near_dropoff', 50.0, $tenantId);

        return $this->createViolation(
            driver: $driver,
            tenantId: $tenantId,
            riderId: $delivery->sender_id,
            deliveryId: $delivery->id,
            type: DriverViolation::TYPE_PARCEL_CANCEL_NEAR_DROPOFF,
            fine: $fine,
            reason: $reason,
            distanceKm: $distance,
            evidence: ['status' => $status, 'radius_km' => $radiusKm, 'rule' => 'R-P2'],
        );
    }

    /**
     * R3: advisory collusion flag — same rider+driver pair cancelled >= threshold times
     * inside the window. Never auto-fined; admin reviews.
     */
    public function detectCollusion(User $rider, User $driver, ?int $days = null): ?DriverViolation
    {
        $tenantId = $driver->tenant_id;
        $days ??= (int) $this->settingService->getFloat('fraud_collusion_window_days', 7.0, $tenantId);
        $threshold = (int) $this->settingService->getFloat('fraud_collusion_pair_cancels', 3.0, $tenantId);

        $cancelled = Ride::where('rider_id', $rider->id)
            ->where('driver_id', $driver->id)
            ->where('status', 'cancelled')
            ->where('cancelled_at', '>=', now()->subDays($days))
            ->count();

        if ($cancelled < $threshold) {
            return null;
        }

        $existing = DriverViolation::where('driver_id', $driver->id)
            ->where('rider_id', $rider->id)
            ->where('violation_type', DriverViolation::TYPE_COLLUSION_FLAG)
            ->where('status', DriverViolation::STATUS_PENDING)
            ->where('created_at', '>=', now()->subDays($days))
            ->exists();

        if ($existing) {
            return null;
        }

        return $this->createViolation(
            driver: $driver,
            tenantId: $tenantId,
            riderId: $rider->id,
            type: DriverViolation::TYPE_COLLUSION_FLAG,
            fine: 0.0,
            reason: "{$cancelled} cancelled rides between pair in {$days} days",
            evidence: ['rule' => 'R3', 'pair_cancels' => $cancelled, 'window_days' => $days],
        );
    }

    /**
     * Applies the fine as a wallet debit. Insufficient balance → violation stays pending
     * (debt) and offsets payouts. Returns the resulting status.
     */
    public function applyFine(DriverViolation $violation): string
    {
        if ((float) $violation->fine_amount <= 0) {
            return $violation->status;
        }

        $wallet = $this->walletService->getOrCreateWallet(
            User::where('id', $violation->driver_id)->firstOrFail()
        );

        try {
            $this->walletService->debit(
                $wallet,
                (float) $violation->fine_amount,
                'driver_fine',
                $violation->id,
                "Fine for {$violation->violation_type} on " . implode(':', array_filter([
                    $violation->ride_id,
                    $violation->food_order_id,
                    $violation->delivery_id,
                ])),
            );

            $violation->forceFill(['status' => DriverViolation::STATUS_PAID])->save();

            Log::info('Driver fine applied', [
                'violation_id' => $violation->id,
                'driver_id' => $violation->driver_id,
                'amount' => $violation->fine_amount,
            ]);
        } catch (\RuntimeException $e) {
            Log::info('Driver fine pending (insufficient balance)', [
                'violation_id' => $violation->id,
                'driver_id' => $violation->driver_id,
                'amount' => $violation->fine_amount,
            ]);
        }

        return $violation->status;
    }

    public function unpaidFinesTotal(User $driver): float
    {
        return (float) DriverViolation::where('driver_id', $driver->id)
            ->where('status', DriverViolation::STATUS_PENDING)
            ->sum('fine_amount');
    }

    public function hasUnpaidFines(User $driver): bool
    {
        return $this->unpaidFinesTotal($driver) > 0;
    }

    /**
     * Optional hard gate: drivers with unpaid fines cannot accept new work.
     */
    public function isBlockedFromAccepting(User $driver, ?string $tenantId = null): bool
    {
        $block = $this->settingService->getBool(
            'fraud_unpaid_fines_block_rides',
            false,
            $tenantId ?? $driver->tenant_id,
        );

        return $block && $this->hasUnpaidFines($driver);
    }

    private function createViolation(
        User $driver,
        ?string $tenantId,
        ?string $riderId,
        string $type,
        float $fine,
        string $reason,
        ?string $rideId = null,
        ?string $foodOrderId = null,
        ?string $deliveryId = null,
        ?float $distanceKm = null,
        array $evidence = [],
    ): DriverViolation {
        $violation = DriverViolation::create([
            'tenant_id' => $tenantId,
            'driver_id' => $driver->id,
            'rider_id' => $riderId,
            'ride_id' => $rideId,
            'food_order_id' => $foodOrderId,
            'delivery_id' => $deliveryId,
            'violation_type' => $type,
            'fine_amount' => $fine,
            'status' => DriverViolation::STATUS_PENDING,
            'distance_to_dropoff_km' => $distanceKm,
            'reason' => str($reason)->limit(250)->toString(),
            'evidence' => $evidence,
        ]);

        $this->applyFine($violation);

        return $violation->fresh();
    }

    /**
     * Driver location: latest ride_location_logs for the ride, else user's live location.
     */
    private function driverLocation(?string $driverId, string $context, string $contextId): array
    {
        if ($driverId === null) {
            return [null, null];
        }

        if ($context === 'ride') {
            $log = RideLocationLog::where('ride_id', $contextId)
                ->orderByDesc('recorded_at')
                ->first();

            if ($log) {
                return [(float) $log->latitude, (float) $log->longitude];
            }
        }

        $driver = User::find($driverId);

        return [
            $driver ? (float) $driver->current_latitude : null,
            $driver ? (float) $driver->current_longitude : null,
        ];
    }

    private function distanceToDropoff(array $driverLoc, float $dropoffLat, float $dropoffLng): ?float
    {
        [$lat, $lng] = $driverLoc;

        if ($lat === null || $lng === null || (float) $lat === 0.0 || (float) $lng === 0.0) {
            return null;
        }

        return $this->rideMatchingService->calculateDistance((float) $lat, (float) $lng, $dropoffLat, $dropoffLng);
    }
}