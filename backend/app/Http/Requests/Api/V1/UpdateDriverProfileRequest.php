<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDriverProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'license_number' => 'sometimes|string|max:255',
            'license_expiry' => 'sometimes|date',
            'id_number' => 'sometimes|string|max:255',
            'phone_number' => 'sometimes|string|max:20',
            'emergency_contact_name' => 'sometimes|string|max:255',
            'emergency_contact_phone' => 'sometimes|string|max:20',
            'make' => 'sometimes|string|max:255',
            'model' => 'sometimes|string|max:255',
            'year' => 'sometimes|integer|min:1990|max:'.(date('Y') + 1),
            'color' => 'sometimes|string|max:50',
            'license_plate' => 'sometimes|string|max:20',
            'category' => 'sometimes|string|in:standard,premium,minivan,pets',
        ];
    }
}
