<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\ConsoleHandler;
use App\Exceptions\FatalExceptionFactory;
use App\Exceptions\HttpHandler;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use ErrorException;
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

    /**
     * Runs the database program on the selected database, with the SQL streamed in or out, so that a dump of any
     * size does not need to fit in memory.
     *
     * The password is passed in the MYSQL_PWD variable, and not on the command line, where it would be visible to
     * all the users of the system, e.g., in ps or htop. The database name and the user are not secret, so they stay
     * on the command line, as the client has no environment variables for them.
     *
     * The standard error is always inherited from the current process, so that the errors of the program land in
     * the log. The streams not used by the program are inherited as well.
     *
     * @param ?resource $input read into the standard input of the program, can be any stream, also a userland one
     * @param ?resource $output the standard output of the program, must be backed by a real file descriptor
     */
    private function executeDbCommand(string $program, bool $isRc, $input = null, $output = null): void
    {
        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: $isRc);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername(isRc: $isRc);
        $dbPassword = DatabaseDumpHelper::getDatabasePassword(isRc: $isRc);

        $descriptorSpec = [];
        if ($input !== null) {
            $descriptorSpec[0] = ['pipe', 'r'];
        }
        if ($output !== null) {
            $descriptorSpec[1] = $output;
        }

        $process = proc_open(
            command: "$program $dbName --user=$dbUser",
            descriptor_spec: $descriptorSpec,
            pipes: $pipes,
            env_vars: [...getenv(), 'MYSQL_PWD' => $dbPassword],
        );
        if ($process === false) {
            FatalExceptionFactory::unexpected()->throw();
        }

        try {
            // When the program exits early, e.g. on a broken dump, writing fails with a broken pipe, reported
            // as a notice, which Laravel turns into an exception. The reason of the failure is in the standard
            // error of the program, so it is reported by the exit code below, and not by this write.
            $copied = ($input === null) || stream_copy_to_stream($input, $pipes[0]) !== false;
        } catch (ErrorException) {
            $copied = false;
        } finally {
            if ($input !== null) {
                // The program waits for the end of input, so the pipe must be closed before waiting for the program.
                fclose($pipes[0]);
            }
            $result = proc_close($process);
        }

        if ($result !== 0 || !$copied) {
            FatalExceptionFactory::unexpected()->throw();
        }
    }

    /** @param resource $output the file the dump is written to */
    protected function executeDump(bool $isFromRc, $output): void
    {
        $this->executeDbCommand('mariadb-dump', $isFromRc, output: $output);
    }

    /** @param resource $input the stream with the SQL to restore */
    protected function executeRestore(bool $isToRc, $input): void
    {
        $this->executeDbCommand('mariadb', $isToRc, input: $input);
    }
}
