<?php

namespace App\Services\Database\Jobs;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use DateTimeImmutable;

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
        // The program runs the statements as they come, so a damaged dump has to be found before.
        DatabaseDumpHelper::verifyDumpSql($this->dbDump);
        DatabaseDumpHelper::readDumpSql(
            $this->dbDump,
            fn(mixed $sql) => $this->executeRestore(isToRc: $this->isToRc, input: $sql),
        );

        $this->dbDump->status = DatabaseDumpStatus::created;
        if ($this->isToRc) {
            $this->dbDump->restored_rc_at = new DateTimeImmutable();
        } else {
            $this->dbDump->restored_prod_at = new DateTimeImmutable();
        }
    }
}
