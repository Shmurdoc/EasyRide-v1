<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8081')),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With', 'X-CSRF-Token', 'X-XSRF-Token'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
