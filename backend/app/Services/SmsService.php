<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private const RATE_LIMIT_MAX = 5;
    private const RATE_LIMIT_TTL = 3600;

    private const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json';

    public function __construct(
        private readonly string $accountSid,
        private readonly string $authToken,
        private readonly string $fromNumber,
    ) {}

    public function send(string $to, string $message): bool
    {
        $rateKey = "sms_rate:{$to}";
        $count = Cache::increment($rateKey);
        if ($count === 1) {
            Cache::put($rateKey, 1, self::RATE_LIMIT_TTL);
        }
        if ($count > self::RATE_LIMIT_MAX) {
            Log::warning('SMS rate limit exceeded', ['to' => $to]);

            return false;
        }

        try {
            $url = sprintf(self::TWILIO_API_URL, $this->accountSid);

            $response = Http::withBasicAuth($this->accountSid, $this->authToken)
                ->asForm()
                ->post($url, [
                    'From' => $this->fromNumber,
                    'To' => $to,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                Log::info('SMS sent', ['to' => $to]);

                return true;
            }

            Log::warning('Twilio SMS failed', [
                'to' => $to,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('Twilio SMS exception', ['error' => $e->getMessage()]);

            return false;
        }
    }

    public function sendRideStatusUpdate(string $phone, string $status, string $driverName = '', string $eta = ''): bool
    {
        $message = match ($status) {
            'accepted' => "Your ride has been accepted by {$driverName}. Driver is on the way.",
            'arrived' => "Your driver {$driverName} has arrived at the pickup point.",
            'in_progress' => "Your ride is now in progress. ETA: {$eta}",
            'completed' => 'Your ride is complete. Thank you for riding with EasyRyde!',
            'cancelled' => 'Your ride has been cancelled. Contact support if you need help.',
            default => "Ride status update: {$status}",
        };

        return $this->send($phone, $message);
    }

    public function sendPaymentConfirmation(string $phone, string $amount, string $method): bool
    {
        $message = "EasyRyde: Payment of R{$amount} received via {$method}. Thank you!";

        return $this->send($phone, $message);
    }

    public function sendOtp(string $phone, string $otp): bool
    {
        $message = "Your EasyRyde verification code is: {$otp}. It expires in 5 minutes.";

        return $this->send($phone, $message);
    }

    public function sendDriverPayout(string $phone, string $amount): bool
    {
        $message = "EasyRyde: Your payout of R{$amount} has been processed. It will reflect in your account within 24-48 hours.";

        return $this->send($phone, $message);
    }

    public function sendSosAlert(string $phone, string $userName, string $rideId): bool
    {
        $message = "URGENT: {$userName} has triggered an SOS alert on ride #{$rideId}. Please take immediate action.";

        return $this->send($phone, $message);
    }
}
