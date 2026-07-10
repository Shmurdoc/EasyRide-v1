<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Support\Facades\Crypt;

trait EncryptsPii
{
    public function encryptPiiField(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        return Crypt::encryptString($value);
    }

    public function decryptPiiField(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            return $value;
        }
    }

    public static function hashPiiField(string $value): string
    {
        return hash('sha256', strtolower(trim($value)));
    }
}
