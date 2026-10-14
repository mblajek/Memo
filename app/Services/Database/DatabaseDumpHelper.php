<?php

namespace App\Services\Database;

use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\DbDump;
use Closure;
use DateTimeImmutable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use ZipArchive;

class DatabaseDumpHelper
{
    public static function dumpsEnabled(): bool
    {
        return ($path = Config::get('database.connections.db_dumps.database')) && file_exists($path);
    }

    public static function checkDumpsEnabled(): void
    {
        if (!self::dumpsEnabled()) {
            ExceptionFactory::dbDumpsDisabled()->throw();
        }
    }

    public static function lastDumpDatetime(): ?DateTimeImmutable
    {
        /** @var ?DbDump $dbDump */
        $dbDump = null;
        if (self::dumpsEnabled()) {
            $dbDump = DbDump::query()
                ->where('is_from_rc', false)
                ->whereIn('status', DatabaseDumpStatus::CREATE_OK)
                ->orderByDesc('created_at')
                ->first();
        }
        return $dbDump?->created_at;
    }

    public static function getDatabaseDumpsPath(): string
    {
        return Config::string('app.db.dump_path');
    }

    public static function getDatabaseName(bool $isRc): string
    {
        return ($isRc ? 'rc_' : '') . DB::getDatabaseName();
    }

    public static function getDatabaseUsername(bool $isRc = false): string
    {
        return ($isRc ? 'rc_' : '')
            . Config::string('database.connections.' . Config::string('database.default') . '.username');
    }

    public static function getDatabasePassword(bool $isRc = false): string
    {
        return $isRc
            ? Config::string('app.db.rc_password')
            : Config::string('database.connections.' . Config::string('database.default') . '.password');
    }

    /**
     * The dump being made goes to a file with a known name, and not to a random one, so that what an interrupted
     * dump leaves behind is found by the next one, instead of piling up. The file is also the lock that keeps two
     * dumps of the same database from running at once.
     */
    public static function getCurrentDumpPath(bool $isRc): string
    {
        return self::getDatabaseDumpsPath() . '/current-dump' . ($isRc ? '-rc' : '') . '.sql';
    }

    /**
     * Tells whether a dump of this database is being made right now, by trying to take its lock. It only answers
     * for this moment: the lock can be taken right after, so the caller cannot treat a no as a reservation. The
     * dump job takes the same lock and stays the one that decides.
     */
    public static function isDumpRunning(bool $isRc): bool
    {
        $path = self::getCurrentDumpPath(isRc: $isRc);
        if (!is_file($path)) {
            return false;
        }
        // Opened for reading, as flock does not need the right to write, and the file must not be created here.
        $file = fopen($path, 'r');
        if ($file === false) {
            // Nothing can be said about the lock, and it is the job that reports what is really wrong with it.
            return false;
        }
        $free = flock($file, LOCK_EX | LOCK_NB);
        fclose($file);
        return !$free;
    }

    public static function getDatabaseDumpPassword(): string
    {
        return Config::string('app.db.dump_password');
    }

    /**
     * Opens the SQL of the dump and passes it to the callback. The SQL is decrypted while being read, so that the
     * dump, which can have hundreds of megabytes, never has to fit in memory. The stream is valid only inside the
     * callback, as it stops working the moment the archive is closed.
     *
     * @param Closure(resource): void $callback
     */
    public static function readDumpSql(DbDump $dbDump, Closure $callback): void
    {
        $innerFile = DbDump::innerFileName($dbDump->name);
        $zipPath = DbDump::fullPath($dbDump->name);

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::RDONLY) !== true) {
            // Restoring is done when things are already bad, so the log has to say what could not be opened.
            Log::error("Cannot open the archive '$zipPath'");
            FatalExceptionFactory::unexpected()->throw();
        }
        $zip->setPassword(self::getDatabaseDumpPassword());
        $sql = $zip->getStream($innerFile);
        if ($sql === false) {
            Log::error("Cannot read '$innerFile' in the archive '$zipPath', most likely the password is invalid");
            $zip->close();
            FatalExceptionFactory::unexpected()->throw();
        }

        try {
            $callback($sql);
        } finally {
            fclose($sql);
            $zip->close();
        }
    }
}
