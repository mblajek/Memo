<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Services\Database\DatabaseDumpService;
use Illuminate\Console\Command;
use ZipArchive;

class DatabaseDumpCommand extends Command
{
    protected $signature = 'fz:db-dump {chown} {password?}';
    protected $description = 'Make zipped database dump with password';

    public function handle()
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
    }
}
