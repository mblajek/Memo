<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\ConsoleHandler;
use App\Exceptions\FatalExceptionFactory;
use App\Exceptions\HttpHandler;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;
use Throwable;

abstract readonly class AbstractDatabaseJob
{
    use SerializesModels;

    protected function __construct(
        public DbDump $dbDump,
        private DatabaseDumpStatus $errorStatus,
    ) {
    }

    /** @throws Throwable */
    public function handle(): void
    {
        /** @var HttpHandler|ConsoleHandler $exceptionHandler */
        $exceptionHandler = App::make(ExceptionHandler::class);
        $exceptionHandler->registerFatalErrorHandler(function () {
            $this->dbDump->status = $this->errorStatus;
            $this->dbDump->saveOrFail();
        });

        try {
            $this->run();
        } catch (Throwable $exception) {
            $this->dbDump->status = $this->errorStatus;
            throw $exception;
        } finally {
            $this->dbDump->saveOrFail();
        }
    }

    abstract protected function run();

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
