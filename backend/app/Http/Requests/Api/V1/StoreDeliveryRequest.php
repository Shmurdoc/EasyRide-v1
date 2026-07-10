<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recipient_name' => 'required|string|max:255',
            'recipient_phone' => 'required|string|max:20',
            'pickup_address' => 'required|string|max:500',
            'pickup_lat' => 'required|numeric|between:-90,90',
            'pickup_lng' => 'required|numeric|between:-180,180',
            'dropoff_address' => 'required|string|max:500',
            'dropoff_lat' => 'required|numeric|between:-90,90',
            'dropoff_lng' => 'required|numeric|between:-180,180',
            'item_description' => 'required|string|max:1000',
            'item_value' => 'nullable|numeric|min:0',
            'payment_method' => 'sometimes|string|in:wallet,cash,payfast,ozow',
            'sender_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
