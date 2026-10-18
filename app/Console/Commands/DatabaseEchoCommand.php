<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpReadException;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;
use Symfony\Component\Console\Output\OutputInterface;
use Throwable;

class DatabaseEchoCommand extends Command
{
    protected $signature = 'fz:db-echo {id}';
    protected $description = 'Echo database dump contents';

    private const int CHUNK_SIZE = 1 << 20;

    public function handle(): int
    {
        DatabaseDumpHelper::checkDumpsEnabled();
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());

        $dbDump = DbDump::query()
            ->whereIn('status', DatabaseDumpStatus::CREATE_OK)
            ->findOrFail(Uuid::fromString($this->argument('id')));

        $zipPath = DbDump::fullPath($dbDump->name);

        $copied = 0;
        try {
            DatabaseDumpHelper::readDumpSql($dbDump, function (mixed $sql) use (&$copied): void {
                // Copied in chunks, as a dump can have hundreds of megabytes.
                while (is_string($chunk = fread($sql, self::CHUNK_SIZE)) && $chunk !== '') {
                    $this->output->write($chunk, false, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);
                    $copied += strlen($chunk);
                }
            });
        } catch (DatabaseDumpReadException $e) {
            return $this->failWith($e->getMessage());
        } catch (Throwable $e) {
            return $this->failWith("Cannot read the dump inside '{$zipPath}': {$e->getMessage()}");
        }
        // Whoever reads the output cannot tell an empty dump from a database with nothing in it, so it is an error.
        if (!$copied) {
            return $this->failWith("The dump inside '{$zipPath}' is empty");
        }

        return self::SUCCESS;
    }

    /** Standard output carries only the dump contents, so errors go to stderr. */
    private function failWith(string $message): int
    {
        Log::error($message);
        $this->output->getErrorStyle()
            ->writeln($message, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);
        return self::FAILURE;
    }
}
