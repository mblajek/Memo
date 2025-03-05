<?php

return [
    'defaults' => [
        'routes' => ['docs' => 'api/docs' /* changed */, 'oauth2_callback' => 'api/oauth2-callback'],
        'paths' => [
            'docs' => base_path('storage/api-docs'),
            'views' => base_path('resources/views/vendor/l5-swagger'),
            'base' => null,
            'excludes' => [],
        ],
        'securityDefinitions' => ['securitySchemes' => []],
        'generate_always' => env('L5_SWAGGER_GENERATE_ALWAYS', false),
        'generate_yaml_copy' => false,
        'proxy' => false,
        'additional_config_url' => null,
        'operations_sort' => null,
        'validator_url' => null,
        'ui' => ['display' => ['doc_expansion' => 'none', 'filter' => true]],
        'constants' => [],
    ],
];
