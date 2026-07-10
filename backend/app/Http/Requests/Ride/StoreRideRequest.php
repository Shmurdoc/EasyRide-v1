<?php

declare(strict_types=1);

namespace App\Http\Requests\Ride;

use Illuminate\Foundation\Http\FormRequest;

class StoreRideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => 'required|string|in:standard,premium,minivan,pets,delivery',
            'pickup_address' => 'required|string|max:500',
            'pickup_lat' => 'required|numeric|between:-90,90',
            'pickup_lng' => 'required|numeric|between:-180,180',
            'dropoff_address' => 'required|string|max:500',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
            'payment_method' => 'required|string|in:wallet,cash,payfast,ozow',
            'promo_code' => 'sometimes|string|max:50',
            'stops' => 'sometimes|array|max:3',
            'stops.*.address' => 'required_with:stops|string|max:500',
            'stops.*.lat' => 'required_with:stops|numeric|between:-90,90',
            'stops.*.lng' => 'required_with:stops|numeric|between:-180,180',
        ];
    }
}
