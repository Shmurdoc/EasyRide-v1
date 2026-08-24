<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\AdminTotpMiddleware;
use App\Http\Middleware\ApiRateLimiterMiddleware;
use App\Http\Middleware\DriverMiddleware;
use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\InputSanitizationMiddleware;
use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Http\Middleware\TenantMiddleware;
use App\Providers\EventServiceProvider;
use App\Providers\PaymentServiceProvider;
use App\Providers\SentryServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpKernel\Exception\ThrottleRequestsException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            RateLimiter::for('auth-login', function (Request $request) {
                return Limit::perMinute(5)->by($request->ip());
            });

            RateLimiter::for('auth-register', function (Request $request) {
                return Limit::perMinute(5)->by($request->ip());
            });

            RateLimiter::for('auth-password', function (Request $request) {
                return Limit::perMinute(3)->by($request->ip());
            });

            RateLimiter::for('api', function (Request $request) {
                return $request->user()
                    ? Limit::perMinute(60)->by($request->user()->id)
                    : Limit::perMinute(30)->by($request->ip());
            });

            RateLimiter::for('promo-apply', function (Request $request) {
                return Limit::perMinute(10)->by($request->ip());
            });

            RateLimiter::for('ride-create', function (Request $request) {
                return Limit::perMinute(5)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('ride-cancel', function (Request $request) {
                return Limit::perMinute(5)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('driver-location', function (Request $request) {
                return Limit::perMinute(30)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('payments', function (Request $request) {
                return Limit::perMinute(10)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('wallet-deposit', function (Request $request) {
                return Limit::perMinute(5)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('wallet-withdraw', function (Request $request) {
                return Limit::perMinute(5)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('promo-crud', function (Request $request) {
                return Limit::perMinute(30)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('sos', function (Request $request) {
                return Limit::perMinute(3)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('chat', function (Request $request) {
                return Limit::perMinute(60)->by($request->user()?->id ?? $request->ip());
            });

            RateLimiter::for('social-auth', function (Request $request) {
                return Limit::perMinute(5)->by($request->ip());
            });

            RateLimiter::for('totp-verify', function (Request $request) {
                return Limit::perMinute(5)->by($request->user()?->id ?? $request->ip());
            });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \App\Http\Middleware\RequestTimingMiddleware::class,
            EnsureFrontendRequestsAreStateful::class,
            SecurityHeadersMiddleware::class,
            InputSanitizationMiddleware::class,
            ApiRateLimiterMiddleware::class,
            ForceHttps::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'tenant' => TenantMiddleware::class,
            'admin' => AdminMiddleware::class,
            'admin.totp' => AdminTotpMiddleware::class,
            'driver' => DriverMiddleware::class,
            'security.headers' => SecurityHeadersMiddleware::class,
            'rate.limit' => ApiRateLimiterMiddleware::class,
            'sanitize' => InputSanitizationMiddleware::class,
            'webhook.ip' => \App\Http\Middleware\VerifyWebhookSignature::class,
        ]);

        $middleware->trustProxies(at: '*');

        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
            return route('login');
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function (Request $request) {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Too many requests. Please try again later.',
                    'retry_after' => $e->getHeaders()['Retry-After'] ?? 60,
                ], 429, $e->getHeaders());
            }
        });

        $exceptions->reportable(function (Throwable $e) {
            if (app()->bound('sentry')) {
                app('sentry')->captureException($e);
            }
        });
    })
    ->withProviders([
        PaymentServiceProvider::class,
        SentryServiceProvider::class,
        EventServiceProvider::class,
        \App\Providers\HorizonServiceProvider::class,
    ])->create();
