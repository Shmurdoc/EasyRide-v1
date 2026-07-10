<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('wallet-deposit', function ($request) {
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('ride-create', function ($request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('ride-cancel', function ($request) {
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('payments', function ($request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('wallet-withdraw', function ($request) {
            return Limit::perMinute(3)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth-login', function ($request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('auth-register', function ($request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('auth-password', function ($request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('sos', function ($request) {
            return Limit::perMinute(3)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('promo-apply', function ($request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('chat', function ($request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('place-search', function ($request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('promo-crud', function ($request) {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('driver-location', function ($request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        Route::pattern('id', '[0-9a-fA-F-]+');

        if (config('database.default') === 'sqlite') {
            DB::connection()->getPdo()->sqliteCreateFunction('acos', function ($x) {
                return acos($x);
            });
            DB::connection()->getPdo()->sqliteCreateFunction('cos', function ($x) {
                return cos($x);
            });
            DB::connection()->getPdo()->sqliteCreateFunction('sin', function ($x) {
                return sin($x);
            });
            DB::connection()->getPdo()->sqliteCreateFunction('radians', function ($x) {
                return deg2rad($x);
            });
        }
    }
}
