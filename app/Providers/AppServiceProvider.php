<?php

namespace App\Providers;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
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

        Route::bind('facility', function ($value) {
            return Facility::query()->findOrFail($value);
        });

        if (App::hasDebugModeEnabled()) {
            DB::enableQueryLog();
        }
    }
}
