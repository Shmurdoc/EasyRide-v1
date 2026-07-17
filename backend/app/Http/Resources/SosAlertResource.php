<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SosAlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'ride_id' => $this->ride_id,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'location_description' => $this->location_description,
            'status' => $this->status,
            'severity' => $this->severity,
            'acknowledged_by' => $this->acknowledged_by,
            'acknowledged_at' => $this->acknowledged_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'user' => new UserResource($this->whenLoaded('user')),
            'ride' => new RideResource($this->whenLoaded('ride')),
            'acknowledgedBy' => new UserResource($this->whenLoaded('acknowledgedBy')),
        ];
    }
}
