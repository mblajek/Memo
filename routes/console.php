<?php

use App\Console\Commands\SendNotificationsCommand;
use Illuminate\Support\Facades\Artisan;
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
