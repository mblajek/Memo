<?php

return [
    'policy' => \App\Utils\Csp\ContentPolicy::class,
    'nonce_generator' => \App\Utils\Csp\LaravelViteNonceGenerator::class,
];
