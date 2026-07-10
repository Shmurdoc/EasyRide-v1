<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class FutureDate implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value)) {
            $fail('validation.future_date');
            return;
        }

        $date = \Carbon\Carbon::parse($value);

        if ($date->isPast()) {
            $fail('validation.future_date');
        }
    }
}
