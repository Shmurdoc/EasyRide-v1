<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Webhook IP Whitelist
    |--------------------------------------------------------------------------
    |
    | Only requests from these IPs are allowed to reach webhook endpoints.
    | PayFast and Ozow publish their webhook source IPs.
    |
    */

    'ozow' => [
        '34.242.109.146',
        '54.220.223.116',
    ],

    'payfast' => [
        '196.21.166.0/24',
        '196.21.167.0/24',
    ],

    /*
    |--------------------------------------------------------------------------
    | Bypass IP validation (development only)
    |--------------------------------------------------------------------------
    |
    | WARNING: Only enable this in local development. NEVER in production.
    | Default is false (blocking) — webhook IP validation is always enforced
    | unless explicitly disabled via APP_WEBHOOK_BYPASS=true.
    |
    */

    'bypass_in_local' => env('APP_WEBHOOK_BYPASS', false),
];
