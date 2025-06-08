<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Services\Database\DatabaseDumpService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use ZipArchive;

class DatabaseDumpCommand extends Command
{
    protected $signature = 'fz:db-dump';
    protected $description = 'Make zipped database dump with password';

    public function handle(): void
    {
        $dbName = DatabaseDumpService::getDatabaseName();
        $dbUser = DatabaseDumpService::getDatabaseUsername();
        $dbPassword = DatabaseDumpService::getDatabasePassword();
        $dumpsPath = DatabaseDumpService::getDatabaseDumpsPath();
        $dumpPassword = Config::string('app.db.dump_password');

        ob_start();
        system("mariadb-dump $dbName --user=$dbUser --password=$dbPassword", $result);
        $sql = ob_get_clean();

        if ($result) {
            Log::error("db-dump error code: $result");
            return;
        }

        $nameBase = DatabaseDumpService::newDumpName($dbName);
        $innerFile = "$nameBase.sql";
        $zipPath = "$dumpsPath/$nameBase.zip";
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);

        $zip->addFromString($innerFile, $sql);

        $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
        $zip->setPassword($dumpPassword);

        $zip->setCompressionName($innerFile, ZipArchive::CM_DEFLATE, 9);
        $zip->close();
        chmod($zipPath, 0400);
        $this->line($zip->getStatusString());

        if (($backupAuth = Config::string('app.db.backup_auth'))) {
            $response = Http::asMultipart()
                ->withHeaders([
                    'x-memo-auth' => $backupAuth,
                    'x-memo-name' => Config::string('app.name'),
                ])
                ->attach('backup', file_get_contents($zipPath), 'backup.zip')
                ->post(Config::string('app.db.backup_url'));
            $this->line($response->body());
        }
    }
}
