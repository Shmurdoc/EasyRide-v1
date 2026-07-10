<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip() ?? '';
        $isLocal = in_array($ip, ['127.0.0.1', '::1'])
            || str_starts_with($ip, '192.168.')
            || str_starts_with($ip, '10.')
            || str_starts_with($ip, '172.');

        if (! $request->secure() && ! $isLocal && app()->environment() !== 'local') {
            return redirect()->to('https://'.$request->getHost().$request->getRequestUri(), 301);
        }

        return $next($request);
    }
}
