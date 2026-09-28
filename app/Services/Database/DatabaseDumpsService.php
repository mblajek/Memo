<?php

namespace App\Services\Database;

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\ApiController;
use App\Models\DbDump;
use App\Services\Database\Jobs\DatabaseDumpJob;
use App\Services\Database\Jobs\DatabaseRestoreJob;
use DateTimeImmutable;

class DatabaseDumpsService
{
    public function create(bool $isFromRc): DatabaseDumpJob
    {
        DatabaseDumpHelper::checkDumpsEnabled();
        // The job takes this lock as well, and it is the one that decides, but it runs after the response is sent,
        // so what it reports never reaches the caller. Asking here costs nothing and answers the usual case: a dump
        // started by hand while the scheduled one is still running. A dump that starts in between is still caught
        // by the job, and shows up as the error status of the row.
        if (DatabaseDumpHelper::isDumpRunning(isRc: $isFromRc)) {
            ExceptionFactory::dbDumpAlreadyRunning()->throw();
        }

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
                ->where('created_at', '>', new DateTimeImmutable('-15minute'))
                ->exists()
        ) {
            ExceptionFactory::noFreshProdDbDumps(minutes: 15)->throw();
        }

        $dbDump->status = DatabaseDumpStatus::restoring;
        $dbDump->saveOrFail();

        return new DatabaseRestoreJob($dbDump, $isToRc);
    }
}
