<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Delivery;

use App\Http\Requests\Api\V1\ApiFormRequest;

class QuoteDeliveryRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'pickup_lat' => 'required|numeric|between:-90,90',
            'pickup_lng' => 'required|numeric|between:-180,180',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
            'weight_kg' => 'nullable|numeric|min:0|max:100',
        ];
    }
}