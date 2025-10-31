<?php

use Illuminate\Support\Env;

return [
    'default' => 'mariadb',
    'migrations' => 'migrations',
    'connections' => [
        'db_dumps' => [
            'driver' => 'sqlite',
            'database' => Env::get('APP_DB_DUMP_PATH')
                ? (Env::getOrFail('APP_DB_DUMP_PATH') . '/db_dumps.db') : null,
        ],
        'mariadb' => [
            'driver' => 'mariadb',
            'host' => Env::get('DB_HOST'),
            'port' => Env::get('DB_PORT'),
            'database' => Env::getOrFail('DB_DATABASE'),
            'username' => Env::getOrFail('DB_USERNAME'),
            'password' => Env::getOrFail('DB_PASSWORD'),
            'unix_socket' => Env::get('DB_SOCKET'),
            'charset' => 'utf8mb4',
            'collation' => Env::get('DB_COLLATION', 'utf8mb4_0900_ai_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => (Env::get('DB_HOST') && extension_loaded('pdo_mysql')) ? [ // no array_filter
                PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => (bool)Env::get('DB_SSL_VERIFY', true),
                PDO::MYSQL_ATTR_SSL_CA => null,
            ] : [/* no encryption for unix socket connection */],
        ],
    ],
];
