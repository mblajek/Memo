<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpsService;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Config;

class DatabaseDumpCommand extends Command
{
    protected $signature = 'fz:db-dump {mode}';
    protected $description = 'Make zipped database dump with password';

    public function handle(DatabaseDumpsService $databaseDumpService): int
    {
        DatabaseDumpHelper::checkDumpsEnabled();
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());

        // A job that gets killed leaves its row `creating` or `restoring` forever, so such rows are marked as
        // failed here. But the same statuses are also on the rows of jobs that are running right now, which must be
        // left alone. A running job holds the lock of the database it works on, so a row is marked only when no job
        // can be running on its database:
        // - a `creating` row, when its source database (`is_from_rc`) is not locked;
        // - a `restoring` row, when neither database is locked, as the row does not record which database it is
        //   being restored to.
        // A job can still start right after the check and have its row marked. This is harmless: the job sets the
        // final status of its row when it ends.
        $isRcOfIdleDatabases = array_values(array_filter(
            [false, true],
            fn(bool $isRc): bool => !DatabaseDumpHelper::isDatabaseBusy(isRc: $isRc),
        ));
        DbDump::query()
            ->where('status', DatabaseDumpStatus::creating)
            ->whereIn('is_from_rc', $isRcOfIdleDatabases)
            ->update(['status' => DatabaseDumpStatus::create_error]);
        if (count($isRcOfIdleDatabases) === 2) {
            DbDump::query()
                ->where('status', DatabaseDumpStatus::restoring)
                ->update(['status' => DatabaseDumpStatus::restore_error]);
        }

        $env = $this->argument('mode');
        if ($env !== 'rc' && $env !== 'prod' && $env !== 'std' && $env !== 'auto') {
            $this->warn(
                "Invalid mode '$env', options:"
                . "\n  'rc', 'prod', 'std' (dump prod and restore to rc),"
                . "\n  'auto' (dump prod and restore to rc if configured)",
            );
            return self::INVALID;
        }
        $restoreRc = ($env === 'std') || ($env === 'auto' && Config::boolean('app.db.rc_restore'));
        $isFromRc = ($env === 'rc');

        $dbDumpJob = $databaseDumpService->create(isFromRc: $isFromRc);
        Bus::dispatchSync($dbDumpJob);
        $dbDump = $dbDumpJob->dbDump;

        if ($dbDump->status !== DatabaseDumpStatus::created) {
            $this->error($dbDump->status->name);
            return self::FAILURE;
        }
        $this->line(
            "{$dbDump->name} {$dbDump->status->name}"
            . ($dbDump->is_backuped ? ' and backuped' : ''),
        );

        if ($restoreRc) {
            $dbRestoreJob = $databaseDumpService->restore($dbDump, isToRc: true);
            Bus::dispatchSync($dbRestoreJob);

            if ($dbDump->status !== DatabaseDumpStatus::created) {
                $this->error($dbDump->status->name);
                return self::FAILURE;
            }
            $this->line(' ... and restored to rc');
        }

        return self::SUCCESS;
    }
}
