<?php

namespace App\Services\Database;

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\ApiController;
use App\Models\DbDump;
use App\Services\Database\Jobs\DatabaseDumpJob;
use App\Services\Database\Jobs\DatabaseRestoreJob;

class DatabaseDumpsService
{
    public function create(bool $isFromRc): DatabaseDumpJob
    {
        DatabaseDumpHelper::checkDumpsEnabled();

        $dbDump = new DbDump();
        $dbDump->status = DatabaseDumpStatus::creating;
        $dbDump->app_version = ApiController::VERSION;
        $dbDump->is_from_rc = $isFromRc;
        $dbDump->is_backuped = false;
        $dbDump->saveOrFail();

        return new DatabaseDumpJob($dbDump);
    }

    public function restore(DbDump $dbDump, bool $isToRc): DatabaseRestoreJob
    {
        DatabaseDumpHelper::checkDumpsEnabled();

        if (!in_array($dbDump->status, DatabaseDumpStatus::CREATE_OK, strict: true)) {
            ExceptionFactory::invalidDbDumpStatus(status: $dbDump->status)->throw();
        }
        if (
            !$isToRc && !DbDump::query()
                ->whereIn('status', DatabaseDumpStatus::CREATE_OK)
                ->where('is_from_rc', '=', false)
                ->where('created_at', '>', new \DateTimeImmutable('-15minute'))
                ->exists()
        ) {
            ExceptionFactory::noFreshProdDbDumps(minutes: 15)->throw();
        }

        $dbDump->status = DatabaseDumpStatus::restoring;
        $dbDump->saveOrFail();

        return new DatabaseRestoreJob($dbDump, $isToRc);
    }
}
