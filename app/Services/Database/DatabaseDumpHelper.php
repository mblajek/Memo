<?php

namespace App\Services\Database;

use App\Exceptions\FatalExceptionFactory;
use App\Models\DbDump;
use DateTimeImmutable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class DatabaseDumpHelper
{
    public static function dumpsEnabled(): bool
    {
        return (bool)Config::get('app.db.dump_at');
    }

    public static function lastDumpDatetime(): ?DateTimeImmutable
    {
        /** @var ?DbDump $dbDump */
        $dbDump = null;
        if (self::dumpsEnabled()) {
            $dbDump = DbDump::query()
                ->where('is_from_c', false)
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
}
