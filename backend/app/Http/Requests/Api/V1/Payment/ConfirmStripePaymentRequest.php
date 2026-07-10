<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Payment;

use App\Http\Requests\Api\V1\ApiFormRequest;

class ConfirmStripePaymentRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'payment_intent_id' => 'required|string',
        ];
    }
}
