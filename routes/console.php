<?php

use App\Console\Commands\SendNotificationsCommand;
use App\Exceptions\FatalExceptionFactory;
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

if (Config::has('app.db.dump_at')) {
    Schedule::call(function (): int {
        $status = Artisan::call('fz:db-dump');
        if (!$status && Config::boolean('app.db.rc_restore')) {
            $status = Artisan::call('fz:db-restore rc');
        }
        if ($status) {
            FatalExceptionFactory::unexpected()->throw();
        }
        return $status;
    })->dailyAt(
        DateTimeImmutable::createFromFormat('H:i', Config::string('app.db.dump_at'), DateHelper::getUserTimezone())
            ->setTimezone(DateHelper::getSystemTimezone())->format('H:i'),
    );
}
