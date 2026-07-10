<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationPreference extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'push_enabled',
        'email_enabled',
        'sms_enabled',
        'in_app_enabled',
        'ride_updates',
        'payment_updates',
        'promotions',
        'marketing',
        'security_alerts',
    ];

    protected function casts(): array
    {
        return [
            'push_enabled' => 'boolean',
            'email_enabled' => 'boolean',
            'sms_enabled' => 'boolean',
            'in_app_enabled' => 'boolean',
            'ride_updates' => 'boolean',
            'payment_updates' => 'boolean',
            'promotions' => 'boolean',
            'marketing' => 'boolean',
            'security_alerts' => 'boolean',
        ];
    }

    public static function defaultsForUser(string $userId): array
    {
        return [
            'user_id' => $userId,
            'push_enabled' => true,
            'email_enabled' => true,
            'sms_enabled' => true,
            'in_app_enabled' => true,
            'ride_updates' => true,
            'payment_updates' => true,
            'promotions' => true,
            'marketing' => true,
            'security_alerts' => true,
        ];
    }
}
