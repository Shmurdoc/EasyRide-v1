<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'rider_id' => $this->rider_id,
            'driver_id' => $this->driver_id,
            'status' => $this->status,
            'category' => $this->category,
            'pickup_address' => $this->pickup_address,
            'pickup_lat' => $this->pickup_latitude,
            'pickup_lng' => $this->pickup_longitude,
            'dropoff_address' => $this->dropoff_address,
            'dropoff_lat' => $this->dropoff_latitude,
            'dropoff_lng' => $this->dropoff_longitude,
            'distance_km' => $this->distance_km,
            'duration_minutes' => $this->duration_minutes,
            'fare_amount' => $this->fare_amount,
            'total_fare' => $this->total_fare,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'surge_multiplier' => $this->surge_multiplier,
            'promo_code_id' => $this->promo_code_id,
            'discount_amount' => $this->discount_amount,
            'started_at' => $this->started_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'cancellation_reason' => $this->cancellation_reason,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'rider' => new UserResource($this->whenLoaded('rider')),
            'driver' => new UserResource($this->whenLoaded('driver')),
            'payment' => new PaymentResource($this->whenLoaded('payment')),
        ];
    }
}
