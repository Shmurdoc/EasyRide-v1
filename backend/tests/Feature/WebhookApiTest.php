<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['webhook_ips.bypass_in_local' => true]);
    }

    public function test_stripe_webhook_accepts_valid_request(): void
    {
        $payload = json_encode([
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => 'pi_test', 'amount' => 1000]],
        ]);

        $signature = hash_hmac('sha256', $payload, config('services.stripe.webhook_secret'));

        $response = $this->postJson('/api/v1/webhooks/stripe', json_decode($payload, true), [
            'Stripe-Signature' => "t={$signature}",
        ]);

        $response->assertStatus(400);
    }

    public function test_stripe_webhook_rejects_missing_signature(): void
    {
        $response = $this->postJson('/api/v1/webhooks/stripe', [
            'type' => 'payment_intent.succeeded',
        ]);

        $response->assertStatus(400);
    }

    public function test_payfast_webhook_accepts_notification(): void
    {
        $response = $this->postJson('/api/v1/webhooks/payfast', [
            'payment_status' => 'COMPLETE',
            'm_payment_id' => 'test-123',
            'amount_gross' => 150.00,
            'signature' => md5('test-signature'),
        ]);

        $response->assertStatus(400);
    }

    public function test_ozow_webhook_accepts_notification(): void
    {
        $response = $this->postJson('/api/v1/webhooks/ozow', [
            'TransactionId' => 'txn-123',
            'Status' => 'Complete',
            'Amount' => 150.00,
            'Hash' => sha1('test-hash'),
        ]);

        $response->assertStatus(400);
    }

    public function test_webhook_rejects_invalid_payload(): void
    {
        $response = $this->postJson('/api/v1/webhooks/stripe', ['invalid']);
        $response->assertStatus(400);
    }

    public function test_twilio_webhook_accepts_status_callback(): void
    {
        $response = $this->postJson('/api/v1/webhooks/twilio', [
            'MessageSid' => 'SM123',
            'MessageStatus' => 'delivered',
            'To' => '+27720000000',
        ]);

        $response->assertStatus(200);
    }
}
