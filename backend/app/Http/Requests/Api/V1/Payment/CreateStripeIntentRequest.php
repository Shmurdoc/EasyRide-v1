<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Payment;

use App\Http\Requests\Api\V1\ApiFormRequest;

class CreateStripeIntentRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:1',
            'ride_id' => 'sometimes|string|uuid|exists:rides,id',
            'currency' => 'sometimes|string|size:3',
            'metadata' => 'sometimes|array',
        ];
    }
}
