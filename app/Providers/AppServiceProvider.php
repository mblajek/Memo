<?php

namespace App\Providers;

use App\Http\Permissions\PermissionMiddleware;
use App\Services\System\Translator;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton('translator', Translator::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (str_starts_with(env('APP_URL'), 'https')) {
            URL::forceScheme('https');
        }
        // todo: replace this code with docker/vite/laravel configuration
        // if vite.host is localhost it listens only to connections inside container
        // if vite.host is 0.0.0.0, laravel page tries to connect to this url
        $hotFilePath = Vite::hotFile();
        if (is_file($hotFilePath)) {
            $hot2FilePath = "$hotFilePath!";
            if (!is_file($hot2FilePath)) {
                file_put_contents($hot2FilePath, str_replace('0.0.0.0', 'localhost', file_get_contents($hotFilePath)));
            }
            Vite::useHotFile($hot2FilePath);
        }

        if (App::hasDebugModeEnabled()) {
            DB::enableQueryLog();
            // Illuminate\Database\Eloquent\Model::preventLazyLoading();
        }

        // todo: find better way to detect if RC database should be migrates
        if (Config::boolean('app.db.auto_migrate')) {
            Cache::remember('db_auto_migrate_interval', 90, function () {
                Artisan::call('migrate', array_fill_keys(['--step', '--force'], true));
                return true;
            });
        }

        PermissionMiddleware::setPermissions(null);
    }
}
