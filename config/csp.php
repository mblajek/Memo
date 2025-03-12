<?php

return [
    'policy' => App\Csp\ContentPolicy::class,
    'nonce_generator' => App\Csp\LaravelViteNonceGenerator::class,
];
