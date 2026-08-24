<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Delivery;
use App\Models\Ride;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DeliveryService
{
    public function __construct(
        private readonly WalletService $walletService,
        private readonly FleetModeService $fleetModeService,
        private readonly DriverFraudGuardService $fraudGuardService,
    ) {}

    public function createDelivery(array $data): Delivery
    {
        $delivery = Delivery::create($data);

        $fare = $this->quote($delivery);

        $delivery->update([
            'fare_amount' => $fare['total_fare'],
            'distance_km' => $fare['distance_km'],
            'weight_tier' => $fare['weight_tier'],
            'package_weight_kg' => $fare['weight_kg'],
        ]);

        return $delivery->fresh();
    }

    public function quote(Delivery $delivery): array
    {
        $distanceKm = app(RideMatchingService::class)->calculateDistance(
            (float) $delivery->pickup_lat,
            (float) $delivery->pickup_lng,
            (float) $delivery->dropoff_lat,
            (float) $delivery->dropoff_lng,
        );

        return app(FareCalculationService::class)->calculateParcelFare(
            $distanceKm,
            (float) ($delivery->package_weight_kg ?? 1.0),
            $delivery->tenant_id,
        );
    }

    public function quoteByCoordinates(array $data): array
    {
        $delivery = new Delivery($data);

        return $this->quote($delivery);
    }

    public function updateStatus(Delivery $delivery, string $status, ?string $actorId = null, ?string $reason = null, ?string $podPhotoUrl = null): Delivery
    {
        if ($status === 'delivered' && ! $podPhotoUrl) {
            throw new \RuntimeException('Proof of delivery photo is required to complete a delivery.');
        }

        $locked = Delivery::where('id', $delivery->id)->lockForUpdate()->first();

        if (! $locked->transitionTo($status, $actorId, $reason)) {
            throw new \RuntimeException(
                "Cannot transition delivery from '{$locked->status}' to '{$status}'."
            );
        }

        if ($status === 'delivered') {
            $locked->forceFill(['pod_photo_url' => $podPhotoUrl, 'pod_photo_received_at' => now()])->save();
            $this->creditDriverEarnings($locked);
        }

        if ($status === 'cancelled' && $locked->driver_id) {
            User::where('id', $locked->driver_id)->update(['current_ride_id' => null]);
        }

        Log::info('Delivery status updated', [
            'delivery_id' => $locked->id,
            'status' => $status,
            'actor' => $actorId,
        ]);

        return $locked->fresh();
    }

    public function cancelDelivery(Delivery $delivery, string $cancelledBy, string $reason = '', array $allowedStatuses = ['pending', 'accepted', 'at_pickup']): Delivery
    {
        if (! in_array($delivery->status, $allowedStatuses, true)) {
            throw new \RuntimeException('Delivery cannot be cancelled at this stage.');
        }

        return DB::transaction(function () use ($delivery, $cancelledBy, $reason) {
            if (! $delivery->transitionTo('cancelled', $cancelledBy, $reason)) {
                throw new \RuntimeException('Delivery cannot be cancelled at this stage.');
            }

            if ($delivery->payment_status === 'paid') {
                $this->refundPayment($delivery);
            }

            if ($delivery->driver_id) {
                User::where('id', $delivery->driver_id)->update(['current_ride_id' => null]);
            }

            return $delivery->fresh();
        });
    }

    /**
     * Driver-initiated cancel — engine parity with ride R-P1/R-P2 sanctions.
     */
    public function driverCancelDelivery(Delivery $delivery, User $driver, string $reason = ''): Delivery
    {
        $priorStatus = $delivery->status;

        $cancelled = $this->cancelDelivery(
            $delivery,
            (string) $driver->id,
            $reason,
            ['pending', 'accepted', 'at_pickup', 'picked_up', 'in_transit'],
        );

        $this->fraudGuardService->evaluateParcelCancellation(
            $delivery->fresh(),
            $driver,
            $reason,
            $priorStatus,
        );

        return $cancelled;
    }

    public function acceptDelivery(Delivery $delivery, User $driver): Delivery
    {
        if ($delivery->driver_id !== null) {
            throw new \RuntimeException('Delivery already has a driver assigned.');
        }

        if (! in_array($delivery->status, ['pending', 'accepted'], true)) {
            throw new \RuntimeException('Delivery cannot be accepted in current status.');
        }

        return DB::transaction(function () use ($delivery, $driver) {
            if (! $delivery->transitionTo('accepted', (string) $driver->id)) {
                throw new \RuntimeException('Delivery cannot be accepted in current status.');
            }

            $delivery->forceFill(['driver_id' => $driver->id])->save();

            $driver->update(['current_ride_id' => $delivery->id]);

            return $delivery->fresh()->load(['sender', 'driver']);
        });
    }

    public function getAvailableDeliveries(User $driver): Collection
    {
        if ($this->fraudGuardService->isBlockedFromAccepting($driver)) {
            return new Collection;
        }

        $query = Delivery::where('type', 'parcel')
            ->whereNull('driver_id')
            ->whereIn('status', ['pending', 'accepted']);

        $latitude = $driver->current_latitude;
        $longitude = $driver->current_longitude;

        if ($latitude && $longitude) {
            $query->whereRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(COALESCE(dropoff_lat, recipient_latitude))) * cos(radians(COALESCE(dropoff_lng, recipient_longitude)) - radians(?)) + sin(radians(?)) * sin(radians(COALESCE(dropoff_lat, recipient_latitude))))) <= ?',
                [$latitude, $longitude, $latitude, 15]
            );
        }

        $parcels = $query->with(['sender'])
            ->latest()
            ->get();

        return $parcels->filter(fn (Delivery $d) => $this->fleetModeService->allows(
            $driver,
            FleetModeService::VERTICAL_FOOD,
            $d->tenant_id,
        ))->values();
    }

    public function assignToRide(Delivery $delivery, Ride $ride): Delivery
    {
        $delivery->update(['ride_id' => $ride->id]);

        return $delivery->fresh();
    }

    public function getActiveDeliveries(?string $tenantId = null): Collection
    {
        $query = Delivery::whereNotIn('status', ['delivered', 'cancelled']);

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    private function creditDriverEarnings(Delivery $delivery): void
    {
        $driver = $delivery->driver;
        if (! $driver) {
            return;
        }

        $payout = (float) $delivery->fare_amount;
        if ($payout <= 0) {
            return;
        }

        $wallet = $this->walletService->getOrCreateWallet($driver);

        $this->walletService->credit(
            $wallet,
            $payout,
            'parcel_delivery_earnings',
            $delivery->id,
            "Earnings for parcel delivery {$delivery->id}",
        );
    }

    private function refundPayment(Delivery $delivery): void
    {
        $sender = $delivery->sender;
        if (! $sender) {
            return;
        }

        $wallet = $this->walletService->getOrCreateWallet($sender);

        $this->walletService->credit(
            $wallet,
            (float) $delivery->fare_amount,
            'refund',
            $delivery->id,
            "Refund for cancelled delivery {$delivery->id}",
        );

        $delivery->forceFill(['payment_status' => 'refunded'])->save();

        Log::info('Delivery refund processed', [
            'delivery_id' => $delivery->id,
            'amount' => $delivery->fare_amount,
        ]);
    }
}