<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Http\Requests\Api\V1\ApiFormRequest;

class UpdateSurgeZoneRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'super-admin']);
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'center_lat' => 'sometimes|numeric|between:-90,90',
            'center_lng' => 'sometimes|numeric|between:-180,180',
            'radius_meters' => 'sometimes|integer|min:100|max:50000',
            'multiplier' => 'sometimes|numeric|min:1.00|max:2.50',
        ];
    }

    public function messages(): array
    {
        return [
            'center_lat.between' => 'Latitude must be between -90 and 90.',
            'center_lng.between' => 'Longitude must be between -180 and 180.',
            'radius_meters.min' => 'Radius must be at least 100 meters.',
            'radius_meters.max' => 'Radius cannot exceed 50,000 meters.',
            'multiplier.min' => 'Multiplier must be at least 1.00.',
            'multiplier.max' => 'Multiplier cannot exceed 2.50.',
        ];
    }
}
