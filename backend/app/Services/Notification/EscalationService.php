<?php

namespace App\Services\Notification;

use App\Models\SosAlert;
use App\Services\PushNotificationService;
use App\Services\SmsService;
use Illuminate\Support\Facades\Log;

class EscalationService
{
    public function __construct(
        protected PushNotificationService $push,
        protected SmsService $sms,
    ) {}

    public function escalate(SosAlert $sosAlert): void
    {
        $alert = $sosAlert->load('user', 'ride');

        $this->push->sendToRole('admin', 'SOS Alert!',
            "{$alert->user->name} triggered an emergency on ride {$alert->ride_id}", [
                'deep_link' => "easyryde://admin/sos/{$alert->id}",
                'sos_id' => $alert->id,
            ]);

        Log::info('SOS escalated', ['sos_id' => $alert->id, 'type' => $alert->alert_type ?? 'emergency']);
    }
}
