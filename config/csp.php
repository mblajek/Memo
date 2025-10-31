<?php

return [
    (env('CSP_REPORT_ONLY', false) ? 'report_only_presets' : 'presets') => [
        \Spatie\Csp\Presets\Basic::class,
        \Spatie\Csp\Presets\GoogleFonts::class,
        \App\Utils\Csp\CspPreset::class,
    ],
    'nonce_generator' => \App\Utils\Csp\LaravelViteNonceGenerator::class,
    'nonce_enabled' => true,
    'enabled' => true,
];
