<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FoodOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'restaurant_id' => $this->restaurant_id,
            'customer_id' => $this->customer_id,
            'driver_id' => $this->driver_id,
            'delivery_id' => $this->delivery_id,
            'status' => $this->status,
            'subtotal' => $this->subtotal,
            'delivery_fee' => $this->delivery_fee,
            'service_fee' => $this->service_fee,
            'tip_amount' => $this->tip_amount,
            'total_amount' => $this->total_amount,
            'delivery_address' => $this->delivery_address,
            'delivery_lat' => $this->delivery_latitude,
            'delivery_lng' => $this->delivery_longitude,
            'delivery_notes' => $this->delivery_notes,
            'estimated_delivery_at' => $this->estimated_delivery_at?->toISOString(),
            'actual_delivery_at' => $this->actual_delivery_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'cancelled_by' => $this->cancelled_by,
            'cancellation_reason' => $this->cancellation_reason,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'payment_id' => $this->payment_id,
            'rating' => $this->rating,
            'rating_comment' => $this->rating_comment,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'items' => FoodOrderItemResource::collection($this->whenLoaded('items')),
            'restaurant' => new RestaurantResource($this->whenLoaded('restaurant')),
            'customer' => new UserResource($this->whenLoaded('customer')),
            'driver' => new UserResource($this->whenLoaded('driver')),
        ];
    }
}
