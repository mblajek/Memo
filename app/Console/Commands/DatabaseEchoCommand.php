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

        try {
            // The SQL is copied straight to the output, as a dump can have hundreds of megabytes.
            DatabaseDumpHelper::readDumpSql($dbDump, fn(mixed $sql) => stream_copy_to_stream($sql, STDOUT));
        } catch (Throwable $e) {
            Log::error("Cannot read the dump inside '{$zipPath}': {$e->getMessage()}");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
