<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

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

Artisan::command('fz:hash', function () {
    $this->line(Hash::make($this->secret('Password to be hashed')));
})->purpose('Make password hash');

Artisan::command('fz:user', function () {
    $user = new User();
    do {
        $user->name = $this->ask('Name (with surname)');
    } while (!$user->name);
    do {
        if ($user->email) {
            $this->error('User already exists');
        }
        $user->email = $this->ask('E-mail (optional)');
    } while ($user->email && User::query()->where('email', $user->email)->exists());
    if ($user->email) {
        $user->email_verified_at = $this->confirm('Mark e-mail as confirmed', true) ? (new DateTimeImmutable()) : null;
        $password = $this->secret('Password');
        $user->password = $password ? Hash::make($password) : null;
    }
    $user->created_by = User::SYSTEM;
    $user->saveOrFail();
    $this->line("Created user $user->id");
})->purpose('Create new user');
