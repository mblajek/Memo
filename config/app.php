<?php

use Illuminate\Support\Env;
use Illuminate\Support\Facades\Facade;

return [
    /* used in app cache key */
    'name' => Env::getOrFail('APP_NAME'),
    /* only 'production' is not displayed in application top bar, blocks migrations */
    'env' => Env::getOrFail('APP_ENV'),
    /* display error messages etc., sql in tquery */
    'debug' => (bool)Env::getOrFail('APP_DEBUG'),
    /* used by the console to properly generate URLs when using the Artisan command */
    'url' => Env::getOrFail('APP_URL'),

    /* for internal datetime functions and api - must be UTC */
    'timezone' => 'UTC',
    /* for communication with user - user interface, notifications */
    'user_timezone' => Env::get('APP_USER_TIMEZONE', 'Europe/Warsaw'),

    'locale' => 'pl_PL',
    'available_locales' => ['pl_PL'],
    'fallback_locale' => 'pl_PL',
    'faker_locale' => 'pl_PL',

    /* encryption Key */
    'key' => Env::getOrFail('APP_KEY'),
    'cipher' => 'AES-256-CBC',

    'db' => [
        'auto_migrate' => Env::get('APP_DB_ALWAYS_MIGRATE', false),
        'dump_at' => Env::get('APP_DB_DUMP_AT'),
        'dump_path' => Env::get('APP_DB_DUMP_PATH'),
        'dump_password' => Env::get('APP_DB_DUMP_PASSWORD'),
        'rc_restore' => Env::get('APP_DB_RC_RESTORE'),
        'rc_password' => Env::get('APP_DB_RC_PASSWORD'),
        'backup_url' => Env::get('APP_DB_BACKUP_URL'),
        'backup_auth' => Env::get('APP_DB_BACKUP_AUTH'),
    ],

    'maintenance' => ['driver' => 'file'],

    'providers' => [
        /* Laravel Framework Service Providers... */
        Illuminate\Auth\AuthServiceProvider::class,
        // Illuminate\Broadcasting\BroadcastServiceProvider::class,
        Illuminate\Bus\BusServiceProvider::class,
        Illuminate\Cache\CacheServiceProvider::class,
        Illuminate\Foundation\Providers\ConsoleSupportServiceProvider::class,
        Illuminate\Cookie\CookieServiceProvider::class,
        Illuminate\Database\DatabaseServiceProvider::class,
        Illuminate\Encryption\EncryptionServiceProvider::class,
        Illuminate\Filesystem\FilesystemServiceProvider::class,
        Illuminate\Foundation\Providers\FoundationServiceProvider::class,
        Illuminate\Hashing\HashServiceProvider::class,
        Illuminate\Mail\MailServiceProvider::class,
        // Illuminate\Notifications\NotificationServiceProvider::class,
        // Illuminate\Pagination\PaginationServiceProvider::class,
        // Illuminate\Pipeline\PipelineServiceProvider::class,
        Illuminate\Queue\QueueServiceProvider::class,
        // Illuminate\Redis\RedisServiceProvider::class,
        // Illuminate\Auth\Passwords\PasswordResetServiceProvider::class,
        Illuminate\Session\SessionServiceProvider::class,
        Illuminate\Translation\TranslationServiceProvider::class,
        Illuminate\Validation\ValidationServiceProvider::class,
        Illuminate\View\ViewServiceProvider::class,

        /* Package Service Providers... */

        /* Application Service Providers... */
        App\Providers\AppServiceProvider::class,
        // App\Providers\AuthServiceProvider::class,
        // App\Providers\BroadcastServiceProvider::class,
        App\Providers\EventServiceProvider::class,
        App\Providers\RouteServiceProvider::class,
    ],

    /* usable in tinker, eg. DB instead of Illuminate\Support\Facades\DB */
    'aliases' => Facade::defaultAliases()->merge([
        // 'ExampleClass' => App\Example\ExampleClass::class,
    ])->toArray(),
];
