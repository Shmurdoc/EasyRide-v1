<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\OzowService;
use App\Services\PayFastService;
use App\Services\Payment\CashReconciliationService;
use App\Services\Payment\PaymentRouter;
use App\Services\Payment\PayoutService;
use App\Services\Payment\RefundService;
use App\Services\Payment\StripeService;
use Illuminate\Support\ServiceProvider;

class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Legacy service registrations
        $this->app->singleton(PayFastService::class, function () {
            return new PayFastService(
                merchantId: config('services.payfast.merchant_id', ''),
                merchantKey: config('services.payfast.merchant_key', ''),
                passphrase: config('services.payfast.passphrase', ''),
                sandbox: config('services.payfast.sandbox', true),
                returnUrl: config('services.payfast.return_url', ''),
                cancelUrl: config('services.payfast.cancel_url', ''),
                notifyUrl: config('services.payfast.notify_url', ''),
            );
        });

        $this->app->singleton(OzowService::class, function () {
            return new OzowService(
                siteCode: config('services.ozow.site_code', ''),
                apiKey: config('services.ozow.api_key', ''),
                privateKey: config('services.ozow.private_key', ''),
                sandbox: config('services.ozow.sandbox', true),
                notifyUrl: config('services.ozow.notify_url', ''),
                returnUrl: config('services.ozow.return_url', ''),
                cancelUrl: config('services.ozow.cancel_url', ''),
            );
        });

        // New Payment\* service registrations
        $this->app->singleton(StripeService::class);
        $this->app->singleton(CashReconciliationService::class);
        $this->app->singleton(RefundService::class);
        $this->app->singleton(PayoutService::class);
        $this->app->singleton(PaymentRouter::class);
    }
}
