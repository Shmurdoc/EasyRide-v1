<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class SouthAfricaLicensePlate implements ValidationRule
{
    /**
     * SA license plate formats:
     * - Old: AA 123-456 (2 letters + 3 digits + space + 3 digits)
     * - New: ABC 1234 (3 letters + 4 digits)
     * - GP: AA 123-456-LP (2 letters + 3 digits + dash + 3 digits + dash + 2 letters province)
     */
    private const PATTERNS = [
        '/^[A-Z]{2}\s?\d{3}[-\s]?\d{3}$/i',           // AA 123-456
        '/^[A-Z]{3}\s?\d{4}$/i',                       // ABC 1234
        '/^[A-Z]{2}\s?\d{3}[-\s]?\d{3}[-\s]?[A-Z]{2}$/i', // AA 123-456-LP
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value)) {
            $fail('validation.plate_sa');
            return;
        }

        foreach (self::PATTERNS as $pattern) {
            if (preg_match($pattern, trim($value))) {
                return;
            }
        }

        $fail('validation.plate_sa');
    }

    public static function isValid(string $plate): bool
    {
        foreach (self::PATTERNS as $pattern) {
            if (preg_match($pattern, trim($plate))) {
                return true;
            }
        }
        return false;
    }
}
