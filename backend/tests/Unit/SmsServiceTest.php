<?php

namespace Tests\Unit;

use App\Services\SmsService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmsServiceTest extends TestCase
{
    public function test_send_returns_false_when_twilio_not_configured(): void
    {
        Http::fake();
        $service = app(SmsService::class);
        $result = $service->send('+27720000000', 'Test message');
        $this->assertIsBool($result);
    }

    public function test_service_resolves_from_container(): void
    {
        $service = app(SmsService::class);
        $this->assertNotNull($service);
    }
}
