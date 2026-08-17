<?php

namespace App\Services\Database\Jobs;

use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Closure;
use ErrorException;
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

    /**
     * Runs one step of building the archive and tells whether it succeeded, logging what went wrong. The step
     * reports a failure either by returning false, or, under Laravel, by the warning it raises becoming
     * an exception, so both are treated the same.
     *
     * @param Closure(): bool $step
     */
    private function archiving(ZipArchive $zip, string $zipPath, Closure $step): bool
    {
        try {
            if ($step()) {
                return true;
            }
            $reason = $zip->getStatusString();
        } catch (ErrorException $exception) {
            $reason = $exception->getMessage();
        }
        Log::error("Cannot build the archive '$zipPath': $reason");
        return false;
    }

    /**
     * On a fatal error the finally in run() no longer runs, so the plaintext of the database is dropped here.
     *
     * It is private and called only from here, because emptying the file of a dump that another process is
     * writing would leave it with a part of the database, which then gets archived as a good dump. That this
     * process is the one holding the lock cannot be checked here: flock answers per open file, so asking again
     * from another descriptor of this same process says the file is taken, without telling by whom.
     */
    private function clearCurrentDump(): void
    {
        $path = DatabaseDumpHelper::getCurrentDumpPath(isRc: $this->dbDump->is_from_rc);
        if (is_file($path)) {
            file_put_contents($path, '');
        }
    }

    protected function onFatalError(): void
    {
        try {
            $this->clearCurrentDump();
        } finally {
            parent::onFatalError();
        }
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

        // The dump goes to a file, and not to a string, as it can have hundreds of megabytes. The file has a known
        // name, so that what an interrupted dump leaves behind is found here and not left on the disk forever.
        $sqlPath = DatabaseDumpHelper::getCurrentDumpPath(isRc: $isFromRc);
        // Opened without truncating, as the file may still be the one another dump is writing to right now.
        // The file holds the plaintext of the whole database, so it must not be readable by anyone else. As fopen
        // takes no mode, the umask gives it one already at the creation: a chmod after it would leave a moment
        // when the file is there and readable.
        $umask = umask(0077);
        try {
            $sqlFile = fopen($sqlPath, 'c+');
        } finally {
            umask($umask);
        }
        if ($sqlFile === false) {
            Log::error("Cannot open the file of the dump '$sqlPath'");
            FatalExceptionFactory::unexpected()->throw();
        }
        // The lock holds for as long as the process keeps the file open, and the system drops it even when the
        // process is killed, so a dump killed for the memory it took does not block the next one.
        if (!flock($sqlFile, LOCK_EX | LOCK_NB)) {
            fclose($sqlFile);
            ExceptionFactory::dbDumpAlreadyRunning()->throw();
        }

        try {
            // Nothing but an interrupted dump can leave anything here, as the lock is taken above.
            $leftover = fstat($sqlFile);
            // The umask above applies only to a file being created, so one left by an earlier run, e.g. by a
            // version that created it readable, keeps its own mode until it is fixed here.
            if ($leftover && ($leftover['mode'] & 0777) !== 0600) {
                chmod($sqlPath, 0600);
            }
            if ($leftover && $leftover['size']) {
                Log::warning("Dropping the {$leftover['size']} bytes left in '$sqlPath'"
                    . ' by a dump interrupted on ' . date('c', $leftover['mtime']));
            }
            ftruncate($sqlFile, 0);

            $this->executeDump(isFromRc: $isFromRc, output: $sqlFile);
            // The size is taken from the open descriptor, as the child process wrote to the file, and the size
            // cached by php for its path can be the zero from before the dump.
            $sqlStat = fstat($sqlFile);
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
            // Both calls report a failure by returning false, but under Laravel the warning they raise becomes an
            // exception first, so both ways lead here. Without it a failed addFile would leave an archive that
            // closes as valid, but is empty, and gets stored and sent to the backup endpoint as a good dump.
            $added = $this->archiving($zip, $zipPath, fn(): bool => $zip->addFile($sqlPath, $innerFile));
            if ($added) {
                $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
                $zip->setPassword(DatabaseDumpHelper::getDatabaseDumpPassword());
                $zip->setCompressionName($innerFile, ZipArchive::CM_DEFLATE, 9);
            }
            // The whole archive is written on close, so this is where running out of disk space shows up.
            if (!$this->archiving($zip, $zipPath, $zip->close(...)) || !$added) {
                FatalExceptionFactory::unexpected()->throw();
            }
        } finally {
            // The file keeps its name and the lock to the very end, and only its content is dropped, so that the
            // plaintext of the database does not sit on the disk, and no other dump slips in in the meantime.
            ftruncate($sqlFile, 0);
            fclose($sqlFile);
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
