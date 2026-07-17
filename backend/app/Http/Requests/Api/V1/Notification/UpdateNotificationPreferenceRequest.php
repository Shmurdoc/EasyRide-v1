<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Notification;

use App\Http\Requests\Api\V1\ApiFormRequest;

class UpdateNotificationPreferenceRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'push_enabled' => 'sometimes|boolean',
            'email_enabled' => 'sometimes|boolean',
            'sms_enabled' => 'sometimes|boolean',
            'in_app_enabled' => 'sometimes|boolean',
            'ride_updates' => 'sometimes|boolean',
            'payment_updates' => 'sometimes|boolean',
            'promotions' => 'sometimes|boolean',
            'marketing' => 'sometimes|boolean',
            'security_alerts' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'push_enabled.boolean' => 'Push enabled must be a boolean value.',
            'email_enabled.boolean' => 'Email enabled must be a boolean value.',
            'sms_enabled.boolean' => 'SMS enabled must be a boolean value.',
            'in_app_enabled.boolean' => 'In-app enabled must be a boolean value.',
            'ride_updates.boolean' => 'Ride updates must be a boolean value.',
            'payment_updates.boolean' => 'Payment updates must be a boolean value.',
            'promotions.boolean' => 'Promotions must be a boolean value.',
            'marketing.boolean' => 'Marketing must be a boolean value.',
            'security_alerts.boolean' => 'Security alerts must be a boolean value.',
        ];
    }
}
