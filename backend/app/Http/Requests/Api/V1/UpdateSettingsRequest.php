<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => 'required|string|max:255',
            'value' => 'required',
            'description' => 'nullable|string|max:500',
            'type' => 'sometimes|string|in:string,boolean,number,json,enum',
            'options' => 'nullable|array',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $key = (string) $this->input('key');
            $value = $this->input('value');
            $type = $this->input('type');

            $enumKeys = ['rides_pool_mode', 'food_pool_mode', 'fleet_type_default'];
            if (in_array($key, $enumKeys, true) && is_string($value)) {
                $valid = match ($key) {
                    'fleet_type_default' => in_array($value, ['private', 'easyryde'], true),
                    default => in_array($value, ['both', 'private_only', 'easyryde_only'], true),
                };
                if (! $valid) {
                    $validator->errors()->add('value', "Invalid value for {$key}.");
                }
            }

            if ($type === 'enum'
                && is_array($this->input('options'))
                && is_string($value)
                && ! in_array($value, $this->input('options'), true)) {
                $validator->errors()->add('value', "Value must be one of: " . implode(', ', $this->input('options')) . '.');
            }
        });
    }
}
