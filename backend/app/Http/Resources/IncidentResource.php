<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncidentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reporter_id' => $this->reporter_id,
            'ride_id' => $this->ride_id,
            'delivery_id' => $this->delivery_id,
            'incident_type' => $this->incident_type,
            'severity' => $this->severity,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'assigned_to' => $this->assigned_to,
            'resolution' => $this->resolution,
            'resolved_at' => $this->resolved_at?->toISOString(),
            'evidence_paths' => $this->evidence_paths,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'reporter' => new UserResource($this->whenLoaded('reporter')),
            'assignedTo' => new UserResource($this->whenLoaded('assignedTo')),
            'ride' => new RideResource($this->whenLoaded('ride')),
            'delivery' => new DeliveryResource($this->whenLoaded('delivery')),
        ];
    }
}
