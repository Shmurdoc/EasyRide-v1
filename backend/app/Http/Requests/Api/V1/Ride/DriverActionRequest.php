<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Ride;

use App\Http\Requests\Api\V1\ApiFormRequest;

class DriverActionRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('driver');
    }

    public function rules(): array
    {
        return [];
    }
}
