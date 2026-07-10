<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class SouthAfricaPhone implements ValidationRule
{
    private const PATTERN = '/^\+27[1-9]\d{8}$/';

    private const DISPOSABLE_DOMAINS = [
        'guerrillamail.com', 'tempmail.com', 'throwaway.email',
        'guerrillamailblock.com', 'sharklasers.com', 'guerrillamail.de',
        'dispostable.com', 'mailinator.com', 'yopmail.com',
        'temp-mail.org', 'fakeinbox.com', 'tempmailo.com',
        '10minutemail.com', 'trashmail.com', 'trashmail.me',
        'maildrop.cc', 'mailnesia.com', 'getairmail.com',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value)) {
            $fail('validation.phone_sa');
            return;
        }

        $cleaned = str_replace([' ', '-', '(', ')'], '', $value);

        if (!str_starts_with($cleaned, '+27')) {
            $fail('validation.phone_sa');
            return;
        }

        if (!preg_match(self::PATTERN, $cleaned)) {
            $fail('validation.phone_sa');
        }
    }

    public static function isValidPhone(string $phone): bool
    {
        $cleaned = str_replace([' ', '-', '(', ')'], '', $phone);
        return preg_match(self::PATTERN, $cleaned) === 1;
    }

    public static function isDisposableEmail(string $email): bool
    {
        $domain = strtolower(substr(strrchr($email, '@'), 1));
        return in_array($domain, self::DISPOSABLE_DOMAINS, true);
    }
}
