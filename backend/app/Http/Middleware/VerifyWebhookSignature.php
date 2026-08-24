<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyWebhookSignature
{
    public function handle(Request $request, Closure $next, ?string $gateway = null): Response
    {
        $gateway = $gateway ?? $request->route()->getAction()['webhook_gateway'] ?? null;

        if (! $gateway) {
            return response()->json(['message' => 'Webhook gateway not configured.'], 500);
        }

        $configKey = "webhook_ips.{$gateway}";
        $allowedIps = config($configKey, []);

        $bypassEnabled = config('webhook_ips.bypass_in_local', false);
        if ($bypassEnabled) {
            \Illuminate\Support\Facades\Log::warning('Webhook IP bypass is ENABLED — this should never happen in production', [
                'gateway' => $gateway,
                'ip' => $request->ip(),
            ]);

            return $next($request);
        }

        if (! empty($allowedIps) && ! $this->isIpAllowed($request->ip(), $allowedIps)) {
            \Illuminate\Support\Facades\Log::warning('Webhook IP rejected', [
                'gateway' => $gateway,
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }

    private function isIpAllowed(string $ip, array $allowedIps): bool
    {
        foreach ($allowedIps as $allowed) {
            if (str_contains($allowed, '/')) {
                if ($this->ipInCidr($ip, $allowed)) {
                    return true;
                }
            } elseif ($ip === $allowed) {
                return true;
            }
        }

        return false;
    }

    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $mask] = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        $maskLong = -1 << (32 - (int) $mask);

        return ($ipLong & $maskLong) === ($subnetLong & $maskLong);
    }
}
