<?php

namespace Tests\Unit\Payment;

use App\Events\PaymentFailed;
use App\Events\PaymentSucceeded;
use App\Models\Payment;
use App\Services\Payment\PayFastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\TestCase;

class PayFastServiceTest extends TestCase
{
    use RefreshDatabase;

    private PayFastService $service;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.payfast' => [
            'merchant_id' => '100001',
            'merchant_key' => 'abc123def',
            'return_url' => 'https://example.com/return',
            'cancel_url' => 'https://example.com/cancel',
            'notify_url' => 'https://example.com/notify',
            'passphrase' => 'testpassphrase',
            'sandbox' => true,
        ]]);
        $this->service = app(PayFastService::class);
    }

    public function test_generate_payment_url_builds_url_with_correct_params(): void
    {
        $url = $this->service->generatePaymentUrl(150.00, 'Test Ride', [
            'payment_id' => 'PAY123',
            'ride_id' => '1',
            'rider_id' => '2',
            'driver_id' => '3',
        ]);

        $this->assertStringContainsString('sandbox.payfast.co.za', $url);
        $this->assertStringContainsString('merchant_id=100001', $url);
        $this->assertStringContainsString('merchant_key=abc123def', $url);
        $this->assertStringContainsString('amount=150.00', $url);
        $this->assertStringContainsString('item_name=Test+Ride', $url);
        $this->assertStringContainsString('m_payment_id=PAY123', $url);
        $this->assertStringContainsString('custom_int1=1', $url);
        $this->assertStringContainsString('custom_int2=2', $url);
        $this->assertStringContainsString('custom_int3=3', $url);
        $this->assertStringContainsString('signature=', $url);
    }

    public function test_generate_payment_url_uses_production_url_when_not_sandbox(): void
    {
        config(['services.payfast.sandbox' => false]);
        $service = app(PayFastService::class);

        $url = $service->generatePaymentUrl(50.00, 'Item');

        $this->assertStringContainsString('www.payfast.co.za', $url);
    }

    public function test_verify_itn_validates_signature_and_status(): void
    {
        $payment = Payment::factory()->create(['status' => 'pending']);

        $data = [
            'merchant_id' => '100001',
            'merchant_key' => 'abc123def',
            'm_payment_id' => 'PAY123',
            'amount' => '150.00',
            'item_name' => 'Test Ride',
            'custom_int1' => $payment->id,
            'payment_status' => 'COMPLETE',
            'pf_payment_id' => 'pf_123',
        ];

        $signature = $this->generateSignature($data);
        $data['signature'] = $signature;

        $this->assertTrue($this->service->verifyItn($data));
    }

    public function test_verify_itn_rejects_invalid_signature(): void
    {
        $data = [
            'merchant_id' => '100001',
            'merchant_key' => 'abc123def',
            'amount' => '150.00',
            'item_name' => 'Test Ride',
            'custom_int1' => Str::uuid()->toString(),
            'payment_status' => 'COMPLETE',
            'signature' => 'invalid_signature',
        ];

        $this->assertFalse($this->service->verifyItn($data));
    }

    public function test_verify_itn_returns_false_when_payment_not_found(): void
    {
        $data = [
            'merchant_id' => '100001',
            'merchant_key' => 'abc123def',
            'amount' => '150.00',
            'item_name' => 'Test Ride',
            'custom_int1' => Str::uuid()->toString(),
            'payment_status' => 'COMPLETE',
        ];

        $signature = $this->generateSignature($data);
        $data['signature'] = $signature;

        $this->assertFalse($this->service->verifyItn($data));
    }

    public function test_verify_itn_returns_false_when_payment_status_not_complete(): void
    {
        $payment = Payment::factory()->create(['status' => 'pending']);

        $data = [
            'merchant_id' => '100001',
            'merchant_key' => 'abc123def',
            'amount' => '150.00',
            'item_name' => 'Test Ride',
            'custom_int1' => $payment->id,
            'payment_status' => 'FAILED',
        ];

        $signature = $this->generateSignature($data);
        $data['signature'] = $signature;

        $this->assertFalse($this->service->verifyItn($data));
    }

    public function test_process_itn_updates_payment_and_dispatches_succeeded_event(): void
    {
        Event::fake();

        $payment = Payment::factory()->create(['status' => 'pending']);

        $data = [
            'custom_int1' => $payment->id,
            'pf_payment_id' => 'pf_123',
            'payment_status' => 'COMPLETE',
            'amount' => '150.00',
            'item_name' => 'Test Ride',
        ];

        $this->service->processItn($data);

        $payment->refresh();
        $this->assertEquals('completed', $payment->status);
        $this->assertEquals('pf_123', $payment->gateway_reference);
        Event::assertDispatched(PaymentSucceeded::class, function ($e) use ($payment) {
            return $e->payment->id === $payment->id;
        });
    }

    public function test_process_itn_updates_payment_and_dispatches_failed_event(): void
    {
        Event::fake();

        $payment = Payment::factory()->create(['status' => 'pending']);

        $data = [
            'custom_int1' => $payment->id,
            'pf_payment_id' => 'pf_456',
            'payment_status' => 'FAILED',
            'amount' => '100.00',
            'item_name' => 'Another Ride',
        ];

        $this->service->processItn($data);

        $payment->refresh();
        $this->assertEquals('failed', $payment->status);
        Event::assertDispatched(PaymentFailed::class, function ($e) use ($payment) {
            return $e->payment->id === $payment->id;
        });
    }

    private function generateSignature(array $data): string
    {
        $passphrase = config('services.payfast.passphrase');
        unset($data['signature']);

        $pfOutput = '';
        foreach ($data as $key => $val) {
            if ($val !== '') {
                $pfOutput .= $key.'='.urlencode(trim((string) $val)).'&';
            }
        }
        $pfOutput = substr($pfOutput, 0, -1);

        if (! empty($passphrase)) {
            $pfOutput .= '&passphrase='.urlencode($passphrase);
        }

        return md5($pfOutput);
    }

    protected function tearDown(): void
    {
        \Mockery::close();
        parent::tearDown();
    }
}
