<?php

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObject;
use App\Models\Grant;
use App\Models\User;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Console\Output\OutputInterface;

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
    PermissionMiddleware::setPermissions(
        new PermissionObject(
            user: User::query()->findOrFail(User::SYSTEM),
            facility: null,
            unauthorised: false,
            unverified: true,
            verified: true,
            globalAdmin: true,
            facilityMember: false,
            facilityClient: false,
            facilityStaff: false,
            facilityAdmin: false,
            developer: false,
        )
    );
    $user = User::query()->newModelInstance();
    $user->created_by = User::SYSTEM;
    $globalAdminGrant = null;
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
        if ($this->confirm('Grant global admin permission', false)) {
            $globalAdminGrant = Grant::query()->newModelInstance();
            $globalAdminGrant->created_by = User::SYSTEM;
        }
        $user->password_expire_at = $this->confirm('Mark password as expired?', false) ? new DateTimeImmutable() : null;
    }
    DB::transaction(function () use ($user, $globalAdminGrant) {
        if ($globalAdminGrant) {
            $globalAdminGrant->saveOrFail();
            $user->global_admin_grant_id = $globalAdminGrant->id;
        }
        $user->saveOrFail();
    });
    $this->line("Created user $user->id");
    PermissionMiddleware::setPermissions(null);
})->purpose('Create new user');

Artisan::command('fz:db-dump {chown} {password?}', function (string $chown, ?string $password = null) {
    $dbName = DB::getDatabaseName();
    $dumpsPath = App::databasePath('dumps');

    ob_start();
    system("mariadb-dump $dbName");
    $sql = ob_get_clean();

    $nameBase = $dbName . '-' . (new DateTimeImmutable())->format('Ymd-His');
    $innerFile = "$nameBase.sql";
    $zipPath = "$dumpsPath/$nameBase.zip";
    $zip = new ZipArchive();
    $zip->open($zipPath, ZipArchive::CREATE);

    $zip->addFromString($innerFile, $sql);
    if ($password !== null) {
        $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
        $zip->setPassword($password);
    }
    $zip->setCompressionName($innerFile, ZipArchive::CM_DEFLATE, 9);
    $zip->close();
    chown($zipPath, $chown);
    chgrp($zipPath, $chown);
    chmod($zipPath, 0400);
    $this->line($zip->getStatusString());
})->purpose('Make zipped database dump with password');

Artisan::command('fz:db-echo {mode} {password?}', function (string $mode, ?string $password = null) {
    if ($mode !== 'path' && $mode !== 'sql') {
        Log::error("Invalid mode '$mode', options: 'path', 'sql'");
        return;
    }
    $dbName = DB::getDatabaseName();
    $dumpsPath = App::databasePath('dumps');

    $dumpFiles = array_filter(
        scandir($dumpsPath),
        fn(string $file) => str_starts_with($file, "$dbName-") && str_ends_with($file, '.zip'),
    );
    rsort($dumpFiles, SORT_STRING);

    $nameBase = preg_replace('/\\.zip$/', '', current($dumpFiles));
    $innerFile = "$nameBase.sql";
    $zipPath = "$dumpsPath/$nameBase.zip";
    if ($mode === 'path') {
        $this->line($zipPath);
        return;
    }
    $zip = new ZipArchive();
    $zip->open($zipPath);

    try {
        if ($password !== null) {
            $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
            $zip->setPassword($password);
        }
        $sql = $zip->getFromName($innerFile);
        $zip->close();
        if (is_string($sql)) {
            $this->output->write($sql, false, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);
        } else {
            Log::error("Cannot read item, maybe invalid password");
        }
    } catch (Throwable $e) {
        Log::error("Cannot read file '{$innerFile}' inside '{$zipPath}': {$e->getMessage()}");
    }
})->purpose('Echo last database dump contents');
