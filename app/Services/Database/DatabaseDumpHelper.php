<?php

namespace App\Services\Database;

use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\DbDump;
use Closure;
use DateTimeImmutable;
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

        $zip = new ZipArchive();
        $zip->open(DbDump::fullPath($dbDump->name), ZipArchive::RDONLY);
        $zip->setPassword(self::getDatabaseDumpPassword());
        $sql = $zip->getStream($innerFile);
        if ($sql === false) {
            $zip->close();
            // Most likely the dump password is invalid.
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
