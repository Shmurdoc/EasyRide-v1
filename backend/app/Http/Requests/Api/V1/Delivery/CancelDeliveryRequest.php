<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Delivery;

use App\Http\Requests\Api\V1\ApiFormRequest;

class CancelDeliveryRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'cancellation_reason' => 'nullable|string|max:500',
        ];
    }
}