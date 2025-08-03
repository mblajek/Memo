<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\FatalExceptionFactory;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use DateTimeImmutable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Throwable;
use ZipArchive;

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
        $dumpName = $this->dbDump->name;
        $innerFile = DbDump::innerFileName($dumpName);
        $zipPath = DbDump::fullPath($dumpName);

        $zip = new ZipArchive();
        $zip->open($zipPath);

        try {
            $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
            $zip->setPassword(DatabaseDumpHelper::getDatabaseDumpPassword());
            $sql = $zip->getFromName($innerFile);
            $zip->close();
            if (!is_string($sql)) {
                Log::error("Cannot read item, maybe invalid password");
                FatalExceptionFactory::unexpected()->throw();
            }
        } catch (Throwable $e) {
            Log::error("Cannot read file '{$innerFile}' inside '{$zipPath}': {$e->getMessage()}");
            FatalExceptionFactory::unexpected()->throw();
        }

        $processResult = Process::input($sql)->run($this->getCommand(isDump: false, isRc: $this->isToRc));

        if ($processResult->failed()) {
            FatalExceptionFactory::unexpected()->throw();
        }

        $this->dbDump->status = DatabaseDumpStatus::created;
        if ($this->isToRc) {
            $this->dbDump->restored_rc_at = new DateTimeImmutable();
        } else {
            $this->dbDump->restored_prod_at = new DateTimeImmutable();
        }
    }
}
