<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Events\PaymentFailed;
use App\Events\PaymentSucceeded;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayfastService
{
    private const SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';

    private const PRODUCTION_URL = 'https://www.payfast.co.za/eng/process';

    private const SANDBOX_ITN_URL = 'https://sandbox.payfast.co.za/eng/query/validate';

    private const PRODUCTION_ITN_URL = 'https://www.payfast.co.za/eng/query/validate';

    protected array $config;

    public function __construct()
    {
        $this->config = config('services.payfast');
    }

    /**
     * Generate a PayFast payment URL for the given amount and order ID.
     */
    public function generatePaymentUrl(float $amount, string $itemName, array $metadata = []): string
    {
        $orderId = $metadata['payment_id'] ?? uniqid('PAY_', true);

        $fields = [
            'merchant_id' => $this->config['merchant_id'] ?? '',
            'merchant_key' => $this->config['merchant_key'] ?? '',
            'return_url' => $this->config['return_url'] ?? '',
            'cancel_url' => $this->config['cancel_url'] ?? '',
            'notify_url' => $this->config['notify_url'] ?? '',
            'm_payment_id' => $orderId,
            'amount' => number_format($amount, 2, '.', ''),
            'item_name' => $itemName,
            'item_description' => "Payment for {$itemName}",
        ];

        if (isset($metadata['ride_id'])) {
            $fields['custom_int1'] = $metadata['ride_id'];
        }
        if (isset($metadata['rider_id'])) {
            $fields['custom_int2'] = $metadata['rider_id'];
        }
        if (isset($metadata['driver_id'])) {
            $fields['custom_int3'] = $metadata['driver_id'];
        }

        $fields['signature'] = $this->generateSignature($fields);

        return $this->getBaseUrl() . '?' . http_build_query($fields);
    }

    /**
     * Verify a PayFast ITN (Instant Transaction Notification) payload.
     */
    public function verifyItn(array $payload): bool
    {
        if (! isset($payload['payment_status']) || $payload['payment_status'] !== 'COMPLETE') {
            Log::warning('PayFast ITN: Payment not complete', [
                'status' => $payload['payment_status'] ?? 'none',
            ]);

            return false;
        }

        $paymentId = $payload['custom_int1'] ?? $payload['m_payment_id'] ?? null;
        $payment = $paymentId ? Payment::find($paymentId) : null;
        if (! $payment) {
            Log::warning('PayFast ITN: Payment not found', ['payment_id' => $paymentId]);

            return false;
        }

        $signature = $this->generateSignature($payload);
        if (! isset($payload['signature']) || $payload['signature'] !== $signature) {
            Log::warning('PayFast ITN: Invalid signature');

            return false;
        }

        return true;
    }

    /**
     * Process a PayFast ITN notification — update the payment and fire events.
     */
    public function processItn(array $payload): void
    {
        $paymentId = $payload['custom_int1'] ?? $payload['m_payment_id'] ?? null;

        if (! $paymentId) {
            Log::warning('PayFast ITN: No payment ID', ['payload' => $payload]);

            return;
        }

        $payment = Payment::find($paymentId);

        if (! $payment) {
            Log::warning('PayFast ITN: Payment not found', ['payment_id' => $paymentId]);

            return;
        }

        $status = match ($payload['payment_status'] ?? '') {
            'COMPLETE' => 'completed',
            'FAILED' => 'failed',
            'PENDING' => 'pending',
            'CANCELLED' => 'cancelled',
            default => 'pending',
        };

        $payment->update([
            'status' => $status,
            'gateway_reference' => $payload['pf_payment_id'] ?? $payment->gateway_reference,
            'gateway_response' => $payload,
            'paid_at' => $status === 'completed' ? now() : $payment->paid_at,
        ]);

        if ($status === 'completed') {
            event(new PaymentSucceeded($payment));
        } elseif ($status === 'failed' || $status === 'cancelled') {
            event(new PaymentFailed($payment));
        }

        Log::info('PayFast ITN processed', [
            'payment_id' => $payment->id,
            'status' => $status,
        ]);
    }

    /**
     * Verify a PayFast ITN (Instant Transaction Notification) payload via HTTP.
     */
    public function verifyPayment(array $payload): bool
    {
        if (! isset($payload['payment_status']) || $payload['payment_status'] !== 'COMPLETE') {
            Log::warning('PayFast ITN: Payment not complete', [
                'status' => $payload['payment_status'] ?? 'none',
            ]);

            return false;
        }

        $signature = $this->generateSignature($payload);
        if (! isset($payload['signature']) || $payload['signature'] !== $signature) {
            Log::warning('PayFast ITN: Invalid signature');

            return false;
        }

        try {
            $verificationData = $this->buildVerificationData($payload);
            $response = Http::timeout(30)->asForm()->post($this->getItnUrl(), $verificationData);

            if ($response->body() === 'VALID') {
                if ((float) ($payload['amount_gross'] ?? 0) !== (float) ($payload['amount'] ?? 0)) {
                    Log::warning('PayFast ITN: Amount mismatch', [
                        'expected' => $payload['amount'],
                        'received' => $payload['amount_gross'],
                    ]);

                    return false;
                }

                return true;
            }

            Log::warning('PayFast ITN: Server returned INVALID', ['response' => $response->body()]);

            return false;
        } catch (\Exception $e) {
            Log::error('PayFast ITN: Verification failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Process a PayFast ITN notification — update the payment and fire events.
     */
    public function handleNotification(array $data): void
    {
        $paymentId = $data['m_payment_id'] ?? null;

        if (! $paymentId) {
            Log::warning('PayFast notification: No payment ID', ['data' => $data]);

            return;
        }

        $payment = Payment::find($paymentId);

        if (! $payment) {
            Log::warning('PayFast notification: Payment not found', ['payment_id' => $paymentId]);

            return;
        }

        $status = match ($data['payment_status'] ?? '') {
            'COMPLETE' => 'completed',
            'FAILED' => 'failed',
            'PENDING' => 'pending',
            'CANCELLED' => 'cancelled',
            default => 'pending',
        };

        $payment->update([
            'status' => $status,
            'gateway_reference' => $data['pf_payment_id'] ?? $payment->gateway_reference,
            'gateway_response' => $data,
            'paid_at' => $status === 'completed' ? now() : $payment->paid_at,
        ]);

        if ($status === 'completed') {
            event(new PaymentSucceeded($payment));
        } elseif ($status === 'failed' || $status === 'cancelled') {
            event(new PaymentFailed($payment));
        }

        Log::info('PayFast notification processed', [
            'payment_id' => $payment->id,
            'status' => $status,
        ]);
    }

    private function generateSignature(array $data): string
    {
        $excludedKeys = ['signature', 'action', 'controller', 'method', '_token'];

        $fields = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $excludedKeys, true)) {
                continue;
            }
            if ($value === '') {
                continue;
            }
            $fields[$key] = $value;
        }

        $parts = [];
        foreach ($fields as $key => $value) {
            $parts[] = $key . '=' . urlencode((string) $value);
        }

        $pfOutput = implode('&', $parts);

        $passphrase = $this->config['passphrase'] ?? '';
        if (! empty($passphrase)) {
            $pfOutput .= '&passphrase=' . urlencode($passphrase);
        }

        return md5($pfOutput);
    }

    /**
     * Verify a PayFast ITN via HTTP POST to PayFast servers.
     */
    public function verifyPaymentWithServer(array $payload): bool
    {
        try {
            $verificationData = $this->buildVerificationData($payload);
            $response = Http::timeout(30)->asForm()->post($this->getItnUrl(), $verificationData);

            if ($response->body() === 'VALID') {
                if ((float) ($payload['amount_gross'] ?? 0) !== (float) ($payload['amount'] ?? 0)) {
                    Log::warning('PayFast ITN: Amount mismatch', [
                        'expected' => $payload['amount'],
                        'received' => $payload['amount_gross'],
                    ]);

                    return false;
                }

                return true;
            }

            Log::warning('PayFast ITN: Server returned INVALID', ['response' => $response->body()]);

            return false;
        } catch (\Exception $e) {
            Log::error('PayFast ITN: Verification failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function buildVerificationData(array $data): array
    {
        $verificationFields = [
            'm_payment_id' => $data['m_payment_id'] ?? '',
            'amount' => $data['amount'] ?? '',
            'item_name' => $data['item_name'] ?? '',
            'item_description' => $data['item_description'] ?? '',
        ];

        $pfOutput = '';
        foreach ($verificationFields as $key => $value) {
            $pfOutput .= $key . '=' . urlencode((string) $value) . '&';
        }

        $passphrase = $this->config['passphrase'] ?? '';
        $pfOutput .= 'passphrase=' . urlencode($passphrase);

        return ['pf_output' => $pfOutput];
    }

    public function getBaseUrl(): string
    {
        return ($this->config['sandbox'] ?? true) ? self::SANDBOX_URL : self::PRODUCTION_URL;
    }

    public function getItnUrl(): string
    {
        return ($this->config['sandbox'] ?? true) ? self::SANDBOX_ITN_URL : self::PRODUCTION_ITN_URL;
    }
}
