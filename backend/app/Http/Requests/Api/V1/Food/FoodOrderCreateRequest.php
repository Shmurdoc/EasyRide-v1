<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Food;

use App\Http\Requests\Api\V1\ApiFormRequest;

class FoodOrderCreateRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'restaurant_id' => 'required|string|exists:restaurants,id',
            'items' => 'required|array|min:1|max:50',
            'items.*.menu_item_id' => 'required|string|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1|max:20',
            'items.*.special_instructions' => 'nullable|string|max:255',
            'delivery_address' => 'required|string|max:500',
            'delivery_lat' => 'required|numeric|between:-90,90',
            'delivery_lng' => 'required|numeric|between:-180,180',
            'subtotal' => 'sometimes|numeric|min:0.01',
            'delivery_fee' => 'sometimes|numeric|min:0',
            'payment_method' => 'required|string|in:wallet,cash,payfast,ozow,stripe',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
