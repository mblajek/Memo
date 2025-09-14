<?php

namespace App\Services\Database\Jobs;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpStatus;
use DateTimeImmutable;
use Illuminate\Console\Application;
use Throwable;

final readonly class DatabaseRestoreJob extends AbstractDatabaseJob
{
    public function __construct(
        private DbDump $dbDump,
        private bool $isToRc,
    ) {
    }

    /** @throws Throwable */
    public function handle(): void
    {
        try {
            $this->restore();
        } catch (Throwable $exception) {
            $this->dbDump->status = DatabaseDumpStatus::restore_error;
            throw $exception;
        } finally {
            $this->dbDump->saveOrFail();
        }
    }

    private function restore(): void
    {
        $this->executeCommand(
            command: Application::formatCommandString("fz:db-echo {$this->dbDump->id}")
            . ' | ' . $this->getRestoreCommand(isToRc: $this->isToRc),
        );

        $this->dbDump->status = DatabaseDumpStatus::created;
        if ($this->isToRc) {
            $this->dbDump->restored_rc_at = new DateTimeImmutable();
        } else {
            $this->dbDump->restored_prod_at = new DateTimeImmutable();
        }
    }
}
