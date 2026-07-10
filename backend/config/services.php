<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'payfast' => [
        'merchant_id' => env('PAYFAST_MERCHANT_ID', ''),
        'merchant_key' => env('PAYFAST_MERCHANT_KEY', ''),
        'passphrase' => env('PAYFAST_PASSPHRASE', ''),
        'sandbox' => env('PAYFAST_SANDBOX', true),
        'return_url' => env('PAYFAST_RETURN_URL', 'https://your-domain.com/payments/payfast/return'),
        'cancel_url' => env('PAYFAST_CANCEL_URL', 'https://your-domain.com/payments/payfast/cancel'),
        'notify_url' => env('PAYFAST_NOTIFY_URL', 'https://your-domain.com/api/v1/payments/payfast/webhook'),
    ],

    'ozow' => [
        'site_code' => env('OZOW_SITE_CODE', ''),
        'api_key' => env('OZOW_API_KEY', ''),
        'private_key' => env('OZOW_PRIVATE_KEY', ''),
        'sandbox' => env('OZOW_SANDBOX', true),
        'notify_url' => env('OZOW_NOTIFY_URL', 'https://your-domain.com/api/v1/payments/ozow/webhook'),
        'return_url' => env('OZOW_RETURN_URL', 'https://your-domain.com/payments/ozow/return'),
        'cancel_url' => env('OZOW_CANCEL_URL', 'https://your-domain.com/payments/ozow/cancel'),
    ],

    'stripe' => [
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'publishable_key' => env('STRIPE_PUBLISHABLE_KEY'),
    ],

    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'service_account_path' => env('FCM_SERVICE_ACCOUNT_PATH', 'storage/firebase-service-account.json'),
    ],

    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'from_number' => env('TWILIO_FROM_NUMBER'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect' => env('APPLE_REDIRECT_URI'),
    ],

    'phbimh' => [
        'base_url' => env('PHBIMH_BASE_URL', 'https://phbimh.co.za/api'),
        'api_key' => env('PHBIMH_API_KEY', ''),
        'webhook_secret' => env('PHBIMH_WEBHOOK_SECRET', ''),
        'timeout' => 30,
    ],

];
