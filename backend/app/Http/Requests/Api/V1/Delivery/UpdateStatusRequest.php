<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Delivery;

use App\Http\Requests\Api\V1\ApiFormRequest;

class UpdateStatusRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'status' => 'required|string|in:pending,accepted,at_pickup,picked_up,in_transit,at_dropoff,delivered,failed,cancelled',
            'pod_photo_url' => 'required_if:status,delivered|nullable|url|max:1000',
            'reason' => 'nullable|string|max:500',
        ];
    }
}