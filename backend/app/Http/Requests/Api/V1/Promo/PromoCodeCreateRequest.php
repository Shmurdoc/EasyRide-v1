<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Promo;

use App\Http\Requests\Api\V1\ApiFormRequest;

class PromoCodeCreateRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'super-admin']);
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|max:50|unique:promo_codes,code',
            'type' => 'required|string|in:fixed,percentage',
            'value' => [
                'required',
                'numeric',
                'min:0.01',
                'max:5000',
            ],
            'min_ride_amount' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0|required_if:type,percentage',
            'max_uses' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'is_active' => 'boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->input('type') === 'percentage' && $this->input('value') > 100) {
                $validator->errors()->add(
                    'value',
                    'Percentage discount must be between 1 and 100.'
                );
            }
        });
    }
}
