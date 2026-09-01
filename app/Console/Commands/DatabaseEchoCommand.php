<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;
use Throwable;

class DatabaseEchoCommand extends Command
{
    protected $signature = 'fz:db-echo {id}';
    protected $description = 'Echo database dump contents';

    public function handle(): int
    {
        DatabaseDumpHelper::checkDumpsEnabled();
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());

        $dbDump = DbDump::query()
            ->whereIn('status', DatabaseDumpStatus::CREATE_OK)
            ->findOrFail(Uuid::fromString($this->argument('id')));

        $zipPath = DbDump::fullPath($dbDump->name);

        $copied = false;
        try {
            // The SQL is copied straight to the output, as a dump can have hundreds of megabytes.
            DatabaseDumpHelper::readDumpSql($dbDump, function (mixed $sql) use (&$copied): void {
                $copied = stream_copy_to_stream($sql, STDOUT);
            });
        } catch (Throwable $e) {
            Log::error("Cannot read the dump inside '{$zipPath}': {$e->getMessage()}");
            return self::FAILURE;
        }
        // Whoever reads the output cannot tell an empty dump from a database with nothing in it, so it is an error.
        if (!$copied) {
            Log::error("The dump inside '{$zipPath}' is empty");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
