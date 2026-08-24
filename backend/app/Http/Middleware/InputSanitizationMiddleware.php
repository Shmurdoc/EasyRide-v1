<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InputSanitizationMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Webhook payloads are signed over their raw body; sanitizing them would
        // break signature verification and reject legitimate payment/partner events.
        if ($request->is('api/v1/webhooks/*')) {
            return $next($request);
        }

        $sanitized = $this->sanitizeInput($request->all());
        $request->merge($sanitized);

        return $next($request);
    }

    private function sanitizeInput(array $data): array
    {
        $passwordFields = ['password', 'password_confirmation', 'current_password'];

        $sanitized = [];

        foreach ($data as $key => $value) {
            if (in_array($key, $passwordFields, true)) {
                $sanitized[$key] = $value;
            } elseif (is_string($value)) {
                $sanitized[$key] = $this->sanitizeString($value);
            } elseif (is_array($value)) {
                $sanitized[$key] = $this->sanitizeInput($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    private function sanitizeString(string $value): string
    {
        $value = trim($value);
        $value = stripslashes($value);
        $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        $value = strip_tags($value);

        return $value;
    }
}
