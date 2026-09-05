<?php

declare(strict_types=1);

namespace App\Http\Resources;

use BackedEnum;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Driver trip item (wraps a Ride model).
 *
 * Money and distance values are pre-cast to float in PHP: PG decimals serialize
 * as strings (e.g. "51.00"), which crash mobile `.toFixed()` calls. On the
 * wire they are always JSON numbers.
 *
 * JSON:
 * {
 *   "id", "status", "category",
 *   "pickup_address", "dropoff_address",
 *   "total_fare": 0.0, "fare_amount": 0.0, "discount_amount": 0.0,
 *   "surge_multiplier": 1.0, "distance_km": 0.0, "duration_minutes": 0.0,
 *   "payment_method", "payment_status",
 *   "started_at": "ISO8601"|null, "completed_at": "ISO8601"|null,
 *   "cancelled_at": "ISO8601"|null,
 *   "created_at": "ISO8601"|null, "updated_at": "ISO8601"|null,
 *   "rider": UserResource (when loaded),
 *   "payment": PaymentResource (when loaded),
 *   "rating": RatingResource (when loaded)
 * }
 */
class TripResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $status = $this->status;

        return [
            'id' => $this->id,
            'status' => $status instanceof BackedEnum ? $status->value : $status,
            'category' => $this->category,
            'pickup_address' => $this->pickup_address,
            'dropoff_address' => $this->dropoff_address,
            'total_fare' => (float) ($this->total_fare ?? 0),
            'fare_amount' => (float) ($this->fare_amount ?? 0),
            'discount_amount' => (float) ($this->discount_amount ?? 0),
            'surge_multiplier' => (float) ($this->surge_multiplier ?? 1),
            'distance_km' => (float) ($this->distance_km ?? 0),
            'duration_minutes' => (float) ($this->duration_minutes ?? 0),
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'started_at' => $this->started_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'rider' => $this->whenLoaded('rider', fn () => new UserResource($this->rider)),
            'payment' => $this->whenLoaded('payment', fn () => new PaymentResource($this->payment)),
            'rating' => $this->whenLoaded('rating', fn () => new RatingResource($this->rating)),
        ];
    }
}
