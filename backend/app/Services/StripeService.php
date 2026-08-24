<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeService
{
    protected readonly ?StripeClient $stripe;

    public function __construct()
    {
        require_once dirname(__DIR__, 2).'/vendor/stripe/stripe-php/init.php';
        $secretKey = config('services.stripe.secret_key');

        $this->stripe = null;
        if ($secretKey) {
            $this->assertSafeMode($secretKey);
            $this->stripe = new StripeClient($secretKey);
        }
    }

    /**
     * Fail closed: refuse to operate if the configured key does not match the
     * declared mode, or if live mode is enabled without an explicit opt-in.
     * This prevents a live key from ever being used by accident during a trial.
     */
    protected function assertSafeMode(string $secretKey): void
    {
        $sandbox = (bool) config('services.stripe.sandbox', true);
        $liveEnabled = (bool) config('services.stripe.live_enabled', false);
        $isTestKey = str_starts_with($secretKey, 'sk_test_') || str_starts_with($secretKey, 'rk_test_');

        if ($sandbox) {
            if (! $isTestKey) {
                throw new \RuntimeException(
                    'Stripe is configured for sandbox but a live secret key was provided. '.
                    'Use a test key (sk_test_/rk_test_) or set STRIPE_SANDBOX=false with STRIPE_LIVE_ENABLED=true.'
                );
            }

            return;
        }

        // Live mode requested.
        if (! $liveEnabled) {
            throw new \RuntimeException(
                'Stripe live mode requires an explicit opt-in. Set STRIPE_LIVE_ENABLED=true to charge real money.'
            );
        }

        if ($isTestKey) {
            throw new \RuntimeException(
                'Stripe is configured for live mode but a test secret key was provided.'
            );
        }
    }

    protected function getStripe(): StripeClient
    {
        if (! $this->stripe) {
            throw new \RuntimeException('Stripe is not configured.');
        }

        return $this->stripe;
    }

    public function createPaymentIntent(float $amount, string $currency = 'zar'): array
    {
        $intent = $this->getStripe()->paymentIntents->create([
            'amount' => (int) round($amount * 100),
            'currency' => strtolower($currency),
        ]);

        return [
            'client_secret' => $intent->client_secret,
            'id' => $intent->id,
        ];
    }

    public function confirmPayment(string $paymentIntentId): array
    {
        $intent = $this->getStripe()->paymentIntents->retrieve($paymentIntentId);

        return [
            'id' => $intent->id,
            'status' => $intent->status,
            'amount' => $intent->amount / 100,
        ];
    }

    public function createCharge(float $amount, string $paymentMethodId, string $currency = 'zar'): array
    {
        $intent = $this->getStripe()->paymentIntents->create([
            'amount' => (int) round($amount * 100),
            'currency' => strtolower($currency),
            'payment_method' => $paymentMethodId,
            'confirm' => true,
            'return_url' => 'https://easyryde.co.za/payments/stripe/return',
        ]);

        return [
            'id' => $intent->id,
            'status' => $intent->status,
            'client_secret' => $intent->client_secret,
        ];
    }

    public function refundPayment(string $paymentIntentId, ?float $amount = null): array
    {
        $params = ['payment_intent' => $paymentIntentId];

        if ($amount !== null) {
            $params['amount'] = (int) round($amount * 100);
        }

        $refund = $this->getStripe()->refunds->create($params);

        return [
            'id' => $refund->id,
            'status' => $refund->status,
            'amount' => $refund->amount / 100,
        ];
    }

    public function handleWebhook(Request $request): array
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $sigHeader,
                config('services.stripe.webhook_secret')
            );
        } catch (\UnexpectedValueException $e) {
            Log::warning('StripeService: invalid webhook payload', ['error' => $e->getMessage()]);
            return ['error' => 'Invalid payload'];
        } catch (SignatureVerificationException $e) {
            Log::warning('StripeService: invalid webhook signature', ['error' => $e->getMessage()]);
            return ['error' => 'Invalid signature'];
        }

        return [
            'type' => $event->type,
            'data' => $event->data->object,
        ];
    }
}
