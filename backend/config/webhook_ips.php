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
    | Bypass in local/dev environments
    |--------------------------------------------------------------------------
    */

    'bypass_in_local' => env('APP_ENV') !== 'production',
];
