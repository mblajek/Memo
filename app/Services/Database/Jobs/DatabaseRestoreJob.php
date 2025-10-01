<?php

namespace App\Services\Database\Jobs;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpStatus;
use DateTimeImmutable;
use Illuminate\Console\Application;

final readonly class DatabaseRestoreJob extends AbstractDatabaseJob
{
    public function __construct(
        DbDump $dbDump,
        private bool $isToRc,
    ) {
        parent::__construct($dbDump, errorStatus: DatabaseDumpStatus::restore_error);
    }

    protected function run(): void
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
