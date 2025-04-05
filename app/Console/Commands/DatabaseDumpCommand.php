<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Services\Database\DatabaseDumpService;
use Illuminate\Console\Command;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Http;
use ZipArchive;

class DatabaseDumpCommand extends Command
{
    protected $signature = 'fz:db-dump {chown} {password?}';
    protected $description = 'Make zipped database dump with password';

    public function handle(): void
    {
        $chown = $this->argument('chown');
        $password = $this->argument('password');

        $dbName = DatabaseDumpService::getDatabaseName();
        $dumpsPath = DatabaseDumpService::getDatabaseDumpsPath();

        ob_start();
        system("mariadb-dump $dbName");
        $sql = ob_get_clean();

        $nameBase = DatabaseDumpService::newDumpName($dbName);
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

        if (($backupAuth = Env::get('APP_BACKUP_AUTH'))) {
            $response = Http::asMultipart()
                ->withHeaders([
                    'x-memo-auth' => $backupAuth,
                    'x-memo-name' => Env::getOrFail('APP_NAME'),
                ])
                ->attach('backup', file_get_contents($zipPath), 'backup.zip')
                ->post(Env::getOrFail('APP_BACKUP_URL'));
            $this->line($response->body());
        }
    }
}
