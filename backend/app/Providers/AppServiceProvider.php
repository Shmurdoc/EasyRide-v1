<?php

namespace App\Providers;

use App\Services\EmailService;
use App\Services\OzowService;
use App\Services\PartnerApiService;
use App\Services\PayFastService;
use App\Services\SmsService;
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
        $this->app->singleton(EmailService::class, function () {
            return new EmailService(
                apiKey: config('services.sendgrid.api_key') ?? '',
                fromEmail: config('services.sendgrid.from_email') ?? 'noreply@easyryde.co.za',
                fromName: config('services.sendgrid.from_name') ?? 'EasyRyde',
            );
        });

        $this->app->singleton(SmsService::class, function () {
            return new SmsService(
                accountSid: config('services.twilio.sid') ?? '',
                authToken: config('services.twilio.auth_token') ?? '',
                fromNumber: config('services.twilio.from_number') ?? '',
            );
        });

        $this->app->singleton(PayFastService::class, function () {
            return new PayFastService(
                merchantId: config('services.payfast.merchant_id') ?? '',
                merchantKey: config('services.payfast.merchant_key') ?? '',
                passphrase: config('services.payfast.passphrase') ?? '',
                sandbox: (bool) (config('services.payfast.sandbox') ?? true),
                returnUrl: config('services.payfast.return_url') ?? '',
                cancelUrl: config('services.payfast.cancel_url') ?? '',
                notifyUrl: config('services.payfast.notify_url') ?? '',
            );
        });

        $this->app->singleton(OzowService::class, function () {
            return new OzowService(
                siteCode: config('services.ozow.site_code') ?? '',
                apiKey: config('services.ozow.api_key') ?? '',
                privateKey: config('services.ozow.private_key') ?? '',
                sandbox: (bool) (config('services.ozow.sandbox') ?? true),
                notifyUrl: config('services.ozow.notify_url') ?? '',
                returnUrl: config('services.ozow.return_url') ?? '',
                cancelUrl: config('services.ozow.cancel_url') ?? '',
            );
        });

        $this->app->singleton(PartnerApiService::class, function () {
            return new PartnerApiService(
                apiKey: config('services.phbimh.api_key') ?? '',
                partnerId: config('services.phbimh.base_url') ?? '',
                webhookSecret: config('services.phbimh.webhook_secret') ?? '',
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('wallet-deposit', function ($request) {
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('wallet-confirm', function ($request) {
            return Limit::perMinute(3)->by($request->user()?->id ?: $request->ip());
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
