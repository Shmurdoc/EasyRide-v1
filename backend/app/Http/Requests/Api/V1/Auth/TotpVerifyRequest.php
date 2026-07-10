<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Api\V1\ApiFormRequest;

class TotpVerifyRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'code' => 'required|string|size:6',
        ];
    }
}
