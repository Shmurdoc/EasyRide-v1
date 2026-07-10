<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

class RequestTimingMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = round((microtime(true) - $start) * 1000, 2);

        $response->headers->set('X-Response-Time', $duration . 'ms');
        $response->headers->set('X-Request-Id', $request->header('X-Request-Id', uniqid()));

        try {
            if ($duration > 1000) {
                Log::channel('performance')->warning('Slow request', [
                    'method' => $request->method(),
                    'path' => $request->path(),
                    'duration_ms' => $duration,
                    'status' => $response->getStatusCode(),
                    'user_id' => $request->user()?->id,
                ]);
            }
        } catch (\Exception $e) {
            // Logging failure must never affect the response
        }

        try {
            $hour = now()->format('Y-m-d-H');
            $prefix = 'inspector:api';

            Redis::incr("{$prefix}:count:{$hour}");
            Redis::expire("{$prefix}:count:{$hour}", 86400);

            Redis::incrbyfloat("{$prefix}:total_time:{$hour}", $duration);
            Redis::expire("{$prefix}:total_time:{$hour}", 86400);

            $status = $response->getStatusCode();
            if ($status >= 400) {
                Redis::incr("{$prefix}:errors:{$hour}");
                Redis::expire("{$prefix}:errors:{$hour}", 86400);
            }

            $endpoint = $request->method() . ':' . preg_replace('/\/\d+/', '/{id}', $request->path());
            Redis::incr("{$prefix}:endpoint:{$endpoint}:{$hour}");
            Redis::expire("{$prefix}:endpoint:{$endpoint}:{$hour}", 86400);
        } catch (\Exception $e) {
            // Redis unavailable — gracefully degrade
        }

        return $response;
    }
}
