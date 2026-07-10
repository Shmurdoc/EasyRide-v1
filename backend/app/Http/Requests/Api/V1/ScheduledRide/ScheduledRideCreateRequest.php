<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\ScheduledRide;

use App\Http\Requests\Api\V1\ApiFormRequest;

class ScheduledRideCreateRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'category' => 'required|string|in:standard,premium,minivan',
            'pickup_latitude' => 'required|numeric|between:-90,90',
            'pickup_longitude' => 'required|numeric|between:-180,180',
            'pickup_address' => 'required|string|max:255',
            'dropoff_latitude' => 'required|numeric|between:-90,90',
            'dropoff_longitude' => 'required|numeric|between:-180,180',
            'dropoff_address' => 'required|string|max:255',
            'scheduled_at' => 'required|date|after:now',
            'pickup_note' => 'nullable|string|max:500',
            'dropoff_note' => 'nullable|string|max:500',
            'recurrence' => 'nullable|string|in:daily,weekly,monthly',
        ];
    }
}
