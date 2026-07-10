<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Food;

use App\Http\Requests\Api\V1\ApiFormRequest;

class FoodOrderCancelRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'reason' => 'sometimes|string|max:500',
        ];
    }
}
