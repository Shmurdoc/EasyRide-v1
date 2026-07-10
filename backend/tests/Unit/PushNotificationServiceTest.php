<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushNotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_resolves_from_container(): void
    {
        $service = app(PushNotificationService::class);
        $this->assertNotNull($service);
    }

    public function test_send_does_not_throw_for_user_without_tokens(): void
    {
        $user = User::factory()->create();
        $service = app(PushNotificationService::class);

        $service->send($user, 'Test', 'Test body');
        $this->assertTrue(true);
    }
}
