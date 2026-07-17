<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Wallet;

use App\Http\Requests\Api\V1\ApiFormRequest;

class ConfirmWalletTopUpRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'transaction_id' => 'required|uuid',
        ];
    }

    public function messages(): array
    {
        return [
            'transaction_id.required' => 'Transaction ID is required.',
            'transaction_id.uuid' => 'Transaction ID must be a valid UUID.',
        ];
    }
}
