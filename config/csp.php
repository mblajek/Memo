<?php

return [
    'policy' => env('CSP_REPORT_ONLY', false) ? '' : \App\Utils\Csp\ContentPolicy::class,
    'report_only_policy' => env('CSP_REPORT_ONLY', false) ? \App\Utils\Csp\ContentPolicy::class : '',
    'nonce_generator' => \App\Utils\Csp\LaravelViteNonceGenerator::class,
];
