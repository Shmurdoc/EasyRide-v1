<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Ride;

use App\Http\Requests\Api\V1\ApiFormRequest;

class UpdateLocationRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'timestamp' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'latitude.between' => 'Latitude must be between -90 and 90.',
            'longitude.between' => 'Longitude must be between -180 and 180.',
        ];
    }
}
