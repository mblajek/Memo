<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Services\Database\DatabaseDumpService;
use Illuminate\Console\Application;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DatabaseRestoreCommand extends Command
{
    protected $signature = 'fz:db-restore {env}';
    protected $description = 'Restore zipped database dump';

    public function handle(): void
    {
        $env = $this->argument('env');

        if ($env !== 'rc' && $env !== 'prod') {
            Log::error("Invalid mode '$env', options: 'rc', 'prod'");
            return;
        }
        $rc = ($env === 'rc');

        $dbName = DatabaseDumpService::getDatabaseName($rc);
        $dbUser = DatabaseDumpService::getDatabaseUsername($rc);
        $dbPassword = DatabaseDumpService::getDatabasePassword($rc);

        $dbEchoCommand = Application::formatCommandString('fz:db-echo sql');

        system("$dbEchoCommand | mariadb $dbName --user=$dbUser --password=$dbPassword", $result);
        if ($result) {
            Log::error("Cannot restore database");
        }
    }
}
