<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Pool;

use App\Http\Requests\Api\V1\ApiFormRequest;

class LeavePoolRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('rider');
    }

    public function rules(): array
    {
        return [
            'pool_ride_id' => 'required|uuid|exists:pool_rides,id',
        ];
    }
}
