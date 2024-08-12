<?php

use Illuminate\Support\Env;

return [
    'default' => 'mysql',
    'migrations' => 'migrations',
    'connections' => [
        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => Env::getOrFail('DB_DATABASE'),
            'username' => Env::getOrFail('DB_USERNAME'),
            'password' => Env::getOrFail('DB_PASSWORD'),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => (env('DB_HOST') && extension_loaded('pdo_mysql')) ? [ // no array_filter
                PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => !!env('DB_SSL_VERIFY'),
                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
            ] : [], // no encryption for unix socket connection
        ],
    ],
];
