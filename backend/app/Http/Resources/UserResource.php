<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            // Additive only: each key appears solely when its relation was
            // eager-loaded (e.g. GET /api/v1/auth/me loads tenant, roles,
            // driverProfile, vehicle). Login/register load only `tenant`, so
            // their payloads are unchanged. No encrypted-PII fields exposed.
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')->values()->all()),
            'vehicle' => $this->whenLoaded('vehicle', fn () => [
                'id' => $this->vehicle->id,
                'make' => $this->vehicle->make,
                'model' => $this->vehicle->model,
                'year' => $this->vehicle->year,
                'color' => $this->vehicle->color,
                'license_plate' => $this->vehicle->license_plate,
                'category' => $this->vehicle->category,
                'is_active' => (bool) $this->vehicle->is_active,
            ]),
            'driver_profile' => $this->whenLoaded('driverProfile', fn () => [
                'id' => $this->driverProfile->id,
                'is_verified' => (bool) $this->driverProfile->is_verified,
                'is_approved' => (bool) $this->driverProfile->is_approved,
                'total_trips' => (int) ($this->driverProfile->total_trips ?? 0),
                'total_earnings' => (float) ($this->driverProfile->total_earnings ?? 0),
                'average_rating' => (float) ($this->driverProfile->average_rating ?? 0),
                'rating_count' => (int) ($this->driverProfile->rating_count ?? 0),
            ]),
            'stats' => $this->whenLoaded('driverProfile', fn () => [
                'total_trips' => (int) ($this->driverProfile->total_trips ?? 0),
                'total_earnings' => (float) ($this->driverProfile->total_earnings ?? 0),
                'average_rating' => (float) ($this->driverProfile->average_rating ?? 0),
                'rating_count' => (int) ($this->driverProfile->rating_count ?? 0),
            ]),
        ];
    }
}
