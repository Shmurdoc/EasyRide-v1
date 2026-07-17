<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduledRideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rider_id' => $this->rider_id,
            'driver_id' => $this->driver_id,
            'category' => $this->category,
            'pickup_address' => $this->pickup_address,
            'pickup_lat' => $this->pickup_latitude,
            'pickup_lng' => $this->pickup_longitude,
            'dropoff_address' => $this->dropoff_address,
            'dropoff_lat' => $this->dropoff_latitude,
            'dropoff_lng' => $this->dropoff_longitude,
            'scheduled_at' => $this->scheduled_at?->toISOString(),
            'status' => $this->status,
            'recurrence' => $this->recurrence,
            'estimated_fare' => $this->estimated_fare,
            'ride_id' => $this->ride_id,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'rider' => new UserResource($this->whenLoaded('rider')),
            'driver' => new UserResource($this->whenLoaded('driver')),
            'ride' => new RideResource($this->whenLoaded('ride')),
        ];
    }
}
