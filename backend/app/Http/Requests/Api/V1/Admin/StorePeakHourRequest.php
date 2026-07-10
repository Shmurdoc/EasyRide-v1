<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Http\Requests\Api\V1\ApiFormRequest;

class StorePeakHourRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'super-admin']);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'multiplier' => 'required|numeric|min:1.00|max:2.50',
        ];
    }

    public function messages(): array
    {
        return [
            'day_of_week.min' => 'Day of week must be between 0 (Sunday) and 6 (Saturday).',
            'day_of_week.max' => 'Day of week must be between 0 (Sunday) and 6 (Saturday).',
            'end_time.after' => 'End time must be after start time.',
            'multiplier.min' => 'Multiplier must be at least 1.00.',
            'multiplier.max' => 'Multiplier cannot exceed 2.50.',
        ];
    }
}
