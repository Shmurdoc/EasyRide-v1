<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\ScheduledRide;

use App\Http\Requests\Api\V1\ApiFormRequest;

class ScheduledRideCancelRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('rider');
    }

    public function rules(): array
    {
        return [
            'scheduled_ride_id' => 'required|string|exists:scheduled_rides,id',
            'reason' => 'nullable|string|max:500',
        ];
    }
}
