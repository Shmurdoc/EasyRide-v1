<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Partner;

use App\Http\Requests\Api\V1\ApiFormRequest;

class ReceivePartnerOrderRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'order_id' => 'required|string|max:100',
            'restaurant_id' => 'required|uuid',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:200',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'delivery_address' => 'required|string|max:500',
            'delivery_lat' => 'required|numeric|between:-90,90',
            'delivery_lng' => 'required|numeric|between:-180,180',
            'customer_name' => 'required|string|max:200',
            'customer_phone' => 'required|string|max:20',
            'special_instructions' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'order_id.required' => 'Order ID is required.',
            'restaurant_id.required' => 'Restaurant ID is required.',
            'restaurant_id.uuid' => 'Restaurant ID must be a valid UUID.',
            'items.required' => 'Order items are required.',
            'items.min' => 'At least one item is required.',
            'items.*.name.required' => 'Item name is required.',
            'items.*.quantity.required' => 'Item quantity is required.',
            'items.*.quantity.min' => 'Item quantity must be at least 1.',
            'items.*.price.required' => 'Item price is required.',
            'items.*.price.min' => 'Item price must be non-negative.',
            'delivery_address.required' => 'Delivery address is required.',
            'delivery_lat.required' => 'Delivery latitude is required.',
            'delivery_lat.between' => 'Delivery latitude must be between -90 and 90.',
            'delivery_lng.required' => 'Delivery longitude is required.',
            'delivery_lng.between' => 'Delivery longitude must be between -180 and 180.',
            'customer_name.required' => 'Customer name is required.',
            'customer_phone.required' => 'Customer phone is required.',
        ];
    }
}
