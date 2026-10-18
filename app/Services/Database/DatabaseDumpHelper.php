<?php

namespace App\Services\Database;

use App\Exceptions\ExceptionFactory;
use App\Models\DbDump;
use Closure;
use DateTimeImmutable;
use ErrorException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
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
        try {
            $file = fopen($path, 'r');
        } catch (ErrorException) {
            $file = false;
        }
        if ($file === false) {
            // Nothing can be said about the lock, and it is the job that reports what is really wrong with it.
            return false;
        }
        // A shared lock, so that checks made at the same time do not take each other for a dump.
        $free = flock($file, LOCK_SH | LOCK_NB);
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
     * The stream reports damaged data only when read past its end, see verifyDumpSql().
     *
     * @param Closure(resource, array): void $callback gets the stream and the entry's
     *     ZipArchive::statName()
     * @throws DatabaseDumpReadException when the archive or the SQL in it cannot be opened
     */
    public static function readDumpSql(DbDump $dbDump, Closure $callback): void
    {
        $innerFile = DbDump::innerFileName($dbDump->name);
        $zipPath = DbDump::fullPath($dbDump->name);

        $zip = new ZipArchive();
        $openResult = $zip->open($zipPath, ZipArchive::RDONLY);
        if ($openResult !== true) {
            throw new DatabaseDumpReadException("Cannot open '{$zipPath}': " . self::zipOpenErrorMessage($openResult));
        }
        $zip->setPassword(self::getDatabaseDumpPassword());
        $sql = $zip->getStream($innerFile);
        if ($sql === false) {
            $readError = $zip->getStatusString();
            $zip->close();
            throw new DatabaseDumpReadException("Cannot read file '{$innerFile}' inside '{$zipPath}': {$readError}");
        }

        try {
            $callback($sql, $zip->statName($innerFile));
        } finally {
            fclose($sql);
            $zip->close();
        }
    }

    /**
     * Reads the whole SQL of the dump, without keeping it, to check that the archive is not damaged.
     * The zip stream checks the CRC only once read past its end, and reading that stops at feof()
     * never gets there, so the size and the CRC are also compared here, with the ones stored in the
     * archive.
     *
     * @throws DatabaseDumpReadException when the SQL cannot be read or is damaged
     */
    public static function verifyDumpSql(DbDump $dbDump): void
    {
        $innerFile = DbDump::innerFileName($dbDump->name);
        $zipPath = DbDump::fullPath($dbDump->name);
        self::readDumpSql($dbDump, function (mixed $sql, array $stat) use ($innerFile, $zipPath): void {
            $crc = hash_init('crc32b');
            try {
                $size = hash_update_stream($crc, $sql);
            } catch (ErrorException $e) {
                throw new DatabaseDumpReadException(
                    "Cannot read file '{$innerFile}' inside '{$zipPath}': {$e->getMessage()}",
                    previous: $e,
                );
            }
            if ($size !== $stat['size'] || hash_final($crc, binary: true) !== pack('N', $stat['crc'])) {
                throw new DatabaseDumpReadException("File '{$innerFile}' inside '{$zipPath}' is damaged");
            }
        });
    }

    private static function zipOpenErrorMessage(int $code): string
    {
        return match ($code) {
            ZipArchive::ER_NOENT => 'No such file',
            ZipArchive::ER_NOZIP => 'Not a zip archive',
            ZipArchive::ER_INCONS => 'Zip archive inconsistent',
            ZipArchive::ER_OPEN => 'Cannot open file',
            ZipArchive::ER_READ => 'Read error',
            default => "Zip error {$code}",
        };
    }
}
