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

        DbDump::query()
            ->where('status', DatabaseDumpStatus::creating)
            ->update(['status' => DatabaseDumpStatus::create_error]);
        DbDump::query()
            ->where('status', DatabaseDumpStatus::restoring)
            ->update(['status' => DatabaseDumpStatus::restore_error]);

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
