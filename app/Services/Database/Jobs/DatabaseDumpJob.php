<?php

namespace App\Services\Database\Jobs;

use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Throwable;
use ZipArchive;

final readonly class DatabaseDumpJob extends AbstractDatabaseJob
{
    public function __construct(
        public DbDump $dbDump,
    ) {
    }

    /** @throws Throwable */
    public function handle(): void
    {
        try {
            $this->createDump();
        } catch (Throwable $exception) {
            $this->dbDump->status = DatabaseDumpStatus::create_error;
            throw $exception;
        } finally {
            $this->dbDump->saveOrFail();
        }
    }

    private function createDump(): void
    {
        $isFromRc = $this->dbDump->is_from_rc;
        $newDumpName = $this->dbDump->getNewDumpName();

        $sql = $this->executeCommand(
            command: $this->getDumpCommand(isFromRc: $isFromRc),
        );

        $zipPath = DbDump::fullPath($newDumpName);
        if (!is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath));
        }
        $innerFile = DbDump::innerFileName($newDumpName);

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFromString($innerFile, $sql);
        $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
        $zip->setPassword(DatabaseDumpHelper::getDatabaseDumpPassword());
        $zip->setCompressionName($innerFile, ZipArchive::CM_DEFLATE, 9);
        $zip->close();
        chmod($zipPath, 0400);

        $this->dbDump->name = $newDumpName;
        $this->dbDump->file_size = filesize($zipPath);
        $this->dbDump->status = DatabaseDumpStatus::created;

        if (!$isFromRc && ($backupAuth = Config::get('app.db.backup_auth'))) {
            $response = Http::asMultipart()
                ->withHeaders([
                    'x-memo-auth' => $backupAuth,
                    'x-memo-name' => Config::string('app.name'),
                ])
                ->attach('backup', file_get_contents($zipPath), 'backup.zip')
                ->post(Config::string('app.db.backup_url'));
            if (
                $response->successful() && str_ends_with($response->body(), ' OK')
            ) {
                $this->dbDump->is_backuped = true;
            }
        }
    }
}
