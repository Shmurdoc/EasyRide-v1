<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Ride;

use App\Http\Requests\Api\V1\ApiFormRequest;

class RideCreateRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('rider');
    }

    public function rules(): array
    {
        return [
            'category' => 'required|string|in:standard,premium,minivan,pets,delivery',
            'pickup_address' => 'required|string|max:255',
            'pickup_lat' => 'required|numeric|between:-90,90',
            'pickup_lng' => 'required|numeric|between:-180,180',
            'dropoff_address' => 'required|string|max:255',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
            'payment_method' => 'required|string|in:wallet,cash,payfast,ozow,stripe',
            'promo_code' => 'nullable|string|max:50',
            'stops' => 'nullable|array|max:3',
            'scheduled_at' => 'nullable|date|after:now',
            'pickup_note' => 'nullable|string|max:500',
            'dropoff_note' => 'nullable|string|max:500',
        ];
    }
}
