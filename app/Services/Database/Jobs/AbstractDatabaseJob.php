<?php

namespace App\Services\Database\Jobs;

use App\Services\Database\DatabaseDumpHelper;
use Illuminate\Queue\SerializesModels;

abstract readonly class AbstractDatabaseJob
{
    use SerializesModels;

    protected function getCommand(bool $isDump, bool $isRc): string
    {
        $program = $isDump ? 'mariadb-dump' : 'mariadb';

        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: $isRc);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername(isRc: $isRc);
        $dbPassword = DatabaseDumpHelper::getDatabasePassword(isRc: $isRc);

        return "$program $dbName --user=$dbUser --password=$dbPassword";
    }
}
