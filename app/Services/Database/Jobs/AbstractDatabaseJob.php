<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\ConsoleHandler;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Exceptions\HttpHandler;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use ErrorException;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
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
        // Unregistered at the end, as a later fatal error in the same process, e.g. in the next
        // job of a console command, is not this job's.
        $onFatalError = $this->onFatalError(...);
        $exceptionHandler->registerFatalErrorHandler($onFatalError);

        try {
            $this->run();
        } catch (Throwable $exception) {
            $this->dbDump->status = $this->errorStatus;
            throw $exception;
        } finally {
            try {
                $this->dbDump->saveOrFail();
            } finally {
                $exceptionHandler->unregisterFatalErrorHandler($onFatalError);
            }
        }
    }

    abstract protected function run();

    private const int LOCK_ATTEMPTS = 10;
    private const int LOCK_RETRY_MICROSECONDS = 100_000;

    /**
     * Takes the lock of the database, which every dump and restore of it holds, so that none of them runs while
     * another is writing to the database or reading it. The lock holds for as long as the returned file stays open,
     * and the system drops it even when the process is killed, so a killed job does not block the next one.
     *
     * The lock is the file of the dump being made, see DatabaseDumpHelper::getCurrentDumpPath(). It is opened
     * without truncating, as another dump may still be writing to it.
     *
     * @return resource the locked file
     */
    protected function lockDatabase(bool $isRc)
    {
        $path = DatabaseDumpHelper::getCurrentDumpPath(isRc: $isRc);
        // The file holds the plaintext of the whole database while a dump is made, so it must not be readable by
        // anyone else. As fopen takes no mode, the umask gives it one already at the creation: a chmod after it
        // would leave a moment when the file is there and readable.
        $umask = umask(0077);
        try {
            $file = fopen($path, 'c+');
        } finally {
            umask($umask);
        }
        if ($file === false) {
            Log::error("Cannot open the lock of the database '$path'");
            FatalExceptionFactory::unexpected()->throw();
        }
        // Checking whether the database is busy takes the lock for a moment, so a failure is retried for a while.
        $locked = flock($file, LOCK_EX | LOCK_NB);
        for ($attempt = 1; !$locked && $attempt < self::LOCK_ATTEMPTS; $attempt++) {
            usleep(self::LOCK_RETRY_MICROSECONDS);
            $locked = flock($file, LOCK_EX | LOCK_NB);
        }
        if (!$locked) {
            fclose($file);
            // The exception is not reported, and the job may run after the response is sent.
            Log::warning("Another dump or restore holds the lock on '$path'");
            ExceptionFactory::dbBusy()->throw();
        }
        return $file;
    }

    /**
     * Called when the process is dying on a fatal error, e.g. after exhausting the memory limit, where the finally
     * blocks of run() no longer run. It does not help when the process is killed by a signal, which nothing catches.
     *
     * A class that overrides it has to call the parent, and to do it in a finally, so that the status is saved
     * even when its own cleaning fails.
     */
    protected function onFatalError(): void
    {
        $this->dbDump->status = $this->errorStatus;
        $this->dbDump->saveOrFail();
    }

    /** The beginning of the standard error is enough to tell what went wrong, and does not flood the log. */
    private const int ERROR_LOG_LENGTH = 10_000;

    /**
     * The variables the program needs, without the secrets of the application. The locale is among them, because
     * the client derives its default character set from it, and MYSQL_* are the configuration of the client itself,
     * e.g. the socket it connects to.
     *
     * @return array<string, string>
     */
    private function getProgramEnv(): array
    {
        return array_filter(
            getenv(),
            fn(string $name): bool => in_array($name, ['PATH', 'HOME', 'TMPDIR', 'LANG'], strict: true)
                || str_starts_with($name, 'LC_') || str_starts_with($name, 'MYSQL_'),
            ARRAY_FILTER_USE_KEY,
        );
    }

    /**
     * Runs the database program on the selected database, with the SQL streamed in or out, so that a dump of any
     * size does not need to fit in memory.
     *
     * The password is passed in the MYSQL_PWD variable, and not on the command line, where it would be visible to
     * all the users of the system, e.g., in ps or htop. The database name and the user are not secret, so they stay
     * on the command line, as the client has no environment variables for them.
     *
     * The standard error is collected to a file, and not inherited, as the process can be serving an http request,
     * where the inherited standard error does not reach the log of the application. On a failure it is logged
     * together with the exit status, and on a success it is dropped. The file is the one of
     * DatabaseDumpHelper::getCurrentErrorPath(), so the caller must hold the lock of the database.
     *
     * @param ?resource $input read into the standard input of the program, can be any stream, also a userland one,
     *     and must not be empty, as the program would accept it and report a success
     * @param ?resource $output the standard output of the program, must be backed by a real file descriptor
     */
    private function executeDbCommand(string $program, bool $isRc, $input = null, $output = null): void
    {
        $dbName = DatabaseDumpHelper::getDatabaseName(isRc: $isRc);
        $dbUser = DatabaseDumpHelper::getDatabaseUsername(isRc: $isRc);
        $dbPassword = DatabaseDumpHelper::getDatabasePassword(isRc: $isRc);

        // The errors can quote the data, e.g. a duplicated value, so the file is readable only by its owner, which
        // the umask gives it at the creation, as for the lock. One left by a killed job is truncated here.
        $errorPath = DatabaseDumpHelper::getCurrentErrorPath(isRc: $isRc);
        $umask = umask(0077);
        try {
            $errorFile = fopen($errorPath, 'w+');
        } finally {
            umask($umask);
        }
        if ($errorFile === false) {
            Log::error("Cannot open the file for the standard error '$errorPath'");
            FatalExceptionFactory::unexpected()->throw();
        }

        try {
            $descriptorSpec = [2 => $errorFile];
            if ($input !== null) {
                $descriptorSpec[0] = ['pipe', 'r'];
            }
            if ($output !== null) {
                $descriptorSpec[1] = $output;
            }

            // The command is passed as an array, so it is executed directly, without a shell. Nothing needs to be
            // escaped, and the status from proc_close is the one of the program, and not of a wrapping shell.
            $process = proc_open(
                command: [$program, $dbName, "--user=$dbUser"],
                descriptor_spec: $descriptorSpec,
                pipes: $pipes,
                env_vars: [...$this->getProgramEnv(), 'MYSQL_PWD' => $dbPassword],
            );
            if ($process === false) {
                FatalExceptionFactory::unexpected()->throw();
            }

            $inputError = null;
            try {
                if ($input !== null) {
                    // When the program exits early, e.g. on a broken dump, writing fails with a broken pipe,
                    // reported as a notice, which Laravel turns into an exception. Whatever the reason, it is the
                    // standard error of the program that tells what really happened.
                    $copied = stream_copy_to_stream($input, $pipes[0]);
                    $inputError = match (true) {
                        ($copied === false) => 'the input could not be written',
                        // The program accepts an empty input and exits with a success, so without this check
                        // restoring a damaged, empty dump would be reported as done.
                        ($copied === 0) => 'the input was empty',
                        default => null,
                    };
                }
            } catch (ErrorException $exception) {
                $inputError = $exception->getMessage();
            } finally {
                if ($input !== null) {
                    // The program waits for the end of input, so the pipe is closed before waiting for the program.
                    fclose($pipes[0]);
                }
                $result = proc_close($process);
            }

            if ($result !== 0 || $inputError !== null) {
                // The program wrote through its own descriptor, so the file is read from its beginning.
                rewind($errorFile);
                $error = trim((string)stream_get_contents($errorFile, length: self::ERROR_LOG_LENGTH));
                Log::error("Command '$program $dbName' failed"
                    . (($inputError === null) ? '' : ", $inputError")
                    . ", exit status $result"
                    . (($error === '') ? ', nothing on the standard error' : ", standard error: $error"));
                FatalExceptionFactory::unexpected()->throw();
            }
        } finally {
            fclose($errorFile);
            unlink($errorPath);
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
