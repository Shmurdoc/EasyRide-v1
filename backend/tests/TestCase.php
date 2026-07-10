<?php

namespace Tests;

use App\Services\EmailService;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

class StubEmailService extends EmailService
{
    public function __construct()
    {
    }

    public function send(string $to, string $subject, string $htmlContent, string $textContent = ''): bool
    {
        return true;
    }

    public function sendTemplate(string $to, string $templateId, array $dynamicData = []): bool
    {
        return true;
    }

    public function sendRideConfirmation(string $to, string $riderName, string $pickup, string $dropoff, string $fare): bool
    {
        return true;
    }

    public function sendPaymentReceipt(string $to, string $riderName, string $rideId, string $amount, string $method): bool
    {
        return true;
    }

    public function sendDriverApproval(string $to, string $driverName, bool $approved, string $reason = ''): bool
    {
        return true;
    }

    public function sendPasswordReset(string $to, string $name, string $resetUrl): bool
    {
        return true;
    }

    public function sendWeeklyEarningsReport(string $to, string $driverName, array $stats): bool
    {
        return true;
    }

    public function sendSosAlert(string $to, string $userName, string $rideId, string $location): bool
    {
        return true;
    }
}

class StubSmsService extends SmsService
{
    public function __construct()
    {
    }

    public function send(string $to, string $message): bool
    {
        return true;
    }

    public function sendRideStatusUpdate(string $phone, string $status, string $driverName = '', string $eta = ''): bool
    {
        return true;
    }

    public function sendPaymentConfirmation(string $phone, string $amount, string $method): bool
    {
        return true;
    }

    public function sendOtp(string $phone, string $otp): bool
    {
        return true;
    }

    public function sendDriverPayout(string $phone, string $amount): bool
    {
        return true;
    }

    public function sendSosAlert(string $phone, string $userName, string $rideId): bool
    {
        return true;
    }
}

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->bind(EmailService::class, StubEmailService::class);
        $this->app->bind(SmsService::class, StubSmsService::class);
    }
}
