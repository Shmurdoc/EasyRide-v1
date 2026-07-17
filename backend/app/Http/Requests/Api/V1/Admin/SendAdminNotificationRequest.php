<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Admin;

use App\Http\Requests\Api\V1\ApiFormRequest;

class SendAdminNotificationRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:100',
            'body' => 'required|string|max:500',
            'type' => 'required|string|in:general,promo,alert,ride_update,account',
            'audience' => 'required|string|in:all,riders,drivers,user',
            'user_id' => 'required_if:audience,user|nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Notification title is required.',
            'title.max' => 'Title must not exceed 100 characters.',
            'body.required' => 'Notification body is required.',
            'body.max' => 'Body must not exceed 500 characters.',
            'type.required' => 'Notification type is required.',
            'type.in' => 'Invalid notification type.',
            'audience.required' => 'Audience is required.',
            'audience.in' => 'Invalid audience selection.',
            'user_id.required_if' => 'User ID is required when audience is set to user.',
        ];
    }
}
