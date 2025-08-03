<?php

use App\Console\Commands\SendNotificationsCommand;
use App\Utils\Date\DateHelper;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Artisan::command('fz:hash', function (): void {
    $this->line(Hash::make($this->secret('Password to be hashed')));
})->purpose('Make password hash');

Schedule::command(SendNotificationsCommand::SIGNATURE)->everyMinute();

if (Config::get('app.db.dump_at')) {
    Schedule::command('fz:db-dump auto')
        ->timezone(DateHelper::getUserTimezone())
        ->dailyAt(Config::string('app.db.dump_at'));
}
