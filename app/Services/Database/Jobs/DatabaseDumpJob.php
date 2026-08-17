<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\FatalExceptionFactory;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use ZipArchive;

final readonly class DatabaseDumpJob extends AbstractDatabaseJob
{
    public function __construct(
        DbDump $dbDump,
    ) {
        parent::__construct($dbDump, errorStatus: DatabaseDumpStatus::create_error);
    }

    protected function run(): void
    {
        $isFromRc = $this->dbDump->is_from_rc;
        $newDumpName = $this->dbDump->getNewDumpName();

        $zipPath = DbDump::fullPath($newDumpName);
        if (!is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath));
        }
        $innerFile = DbDump::innerFileName($newDumpName);

        // The dump goes to a temporary file, and not to a string, as it can have hundreds of megabytes. The file
        // holds the unencrypted dump, but tempnam creates it with the 0600 mode, and it is deleted right after.
        $sqlPath = tempnam(dirname($zipPath), 'dump-');
        if ($sqlPath === false) {
            FatalExceptionFactory::unexpected()->throw();
        }
        try {
            $sqlFile = fopen($sqlPath, 'w');
            try {
                $this->executeDump(isFromRc: $isFromRc, output: $sqlFile);
                // The size is taken from the open descriptor, as the child process wrote to the file, and the size
                // cached by php for its path can be the zero from tempnam.
                $sqlStat = fstat($sqlFile);
            } finally {
                fclose($sqlFile);
            }
            // A program can exit with a success and produce nothing, e.g. when the disk is full. Such a dump must
            // not be stored, marked as created and sent to the backup endpoint, as it restores an empty database.
            if (!$sqlStat || !$sqlStat['size']) {
                Log::error("The dump of the database is empty");
                FatalExceptionFactory::unexpected()->throw();
            }

            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE) !== true) {
                Log::error("Cannot create the archive '$zipPath'");
                FatalExceptionFactory::unexpected()->throw();
            }
            // The dump is read from the file while the archive is being closed, so it is not kept in memory either.
            $zip->addFile($sqlPath, $innerFile);
            $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
            $zip->setPassword(DatabaseDumpHelper::getDatabaseDumpPassword());
            $zip->setCompressionName($innerFile, ZipArchive::CM_DEFLATE, 9);
            // The whole archive is written on close, so this is where running out of disk space shows up.
            if (!$zip->close()) {
                Log::error("Cannot write the archive '$zipPath': {$zip->getStatusString()}");
                FatalExceptionFactory::unexpected()->throw();
            }
        } finally {
            unlink($sqlPath);
        }
        chmod($zipPath, 0400);

        $this->dbDump->name = $newDumpName;
        $this->dbDump->file_size = filesize($zipPath);
        $this->dbDump->status = DatabaseDumpStatus::created;

        if (!$isFromRc && ($backupAuth = Config::get('app.db.backup_auth'))) {
            // The archive is attached as a stream, so that it is sent without reading it into memory.
            $zipFile = fopen($zipPath, 'r');
            try {
                $response = Http::asMultipart()
                    ->withHeaders([
                        'x-memo-auth' => $backupAuth,
                        'x-memo-name' => Config::string('app.name'),
                    ])
                    ->attach('backup', $zipFile, 'backup.zip')
                    ->post(Config::string('app.db.backup_url'));
            } finally {
                fclose($zipFile);
            }
            if (
                $response->successful() && str_ends_with($response->body(), ' OK')
            ) {
                $this->dbDump->is_backuped = true;
            }
        }
    }
}
