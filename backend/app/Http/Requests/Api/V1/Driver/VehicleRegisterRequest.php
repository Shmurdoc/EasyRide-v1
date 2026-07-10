<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Driver;

use App\Http\Requests\Api\V1\ApiFormRequest;

class VehicleRegisterRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && $user->hasRole('driver');
    }

    public function rules(): array
    {
        return [
            'make' => 'required|string|max:100',
            'model' => 'required|string|max:100',
            'year' => 'required|integer|min:1990|max:2030',
            'color' => 'required|string|max:50',
            'license_plate' => 'required|string|max:20|regex:/^[A-Z]{2,3}\s?\d{3,4}[\s-]?[A-Z0-9]{1,4}$/i',
            'category' => 'required|string|in:standard,premium,minivan',
        ];
    }
}
