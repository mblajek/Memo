<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\FatalExceptionFactory;
use App\Services\Database\DatabaseDumpHelper;
use Illuminate\Queue\SerializesModels;

abstract readonly class AbstractDatabaseJob
{
    use SerializesModels;

    private function getDbCommand(string $program, bool $isRc): string
    {
        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: $isRc);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername(isRc: $isRc);
        $dbPassword = DatabaseDumpHelper::getDatabasePassword(isRc: $isRc);

        return "$program $dbName --user=$dbUser --password=$dbPassword";
    }

    protected function getDumpCommand(bool $isFromRc): string
    {
        return $this->getDbCommand('mariadb-dump', $isFromRc);
    }

    protected function getRestoreCommand(bool $isToRc): string
    {
        return $this->getDbCommand('mariadb', $isToRc);
    }

    protected function executeCommand(string $command): string
    {
        ob_start();
        system($command, $result);
        $output = ob_get_clean();

        if ($result !== 0) {
            FatalExceptionFactory::unexpected()->throw();
        }

        return $output;
    }
}
