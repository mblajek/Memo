<?php

namespace App\Services\Database;

use App\Exceptions\FatalExceptionFactory;
use DateTimeImmutable;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;

class DatabaseDumpService
{
    public const string DUMP_DATETIME_FORMAT = 'Ymd-His';

    public static function newDumpName(?string $dbName = null): string
    {
        $dbName ??= self::getDatabaseName();
        return $dbName . '-' . (new DateTimeImmutable())->format(self::DUMP_DATETIME_FORMAT);
    }

    public static function lastDumpName(?string $dbName = null, ?string $dumpsPath = null): ?string
    {
        $dbName ??= self::getDatabaseName();
        $dumpsPath ??= self::getDatabaseDumpsPath();

        $dumpFiles = array_filter(
            scandir($dumpsPath),
            fn(string $file) => str_starts_with($file, "$dbName-") && str_ends_with($file, '.zip'),
        );
        rsort($dumpFiles, SORT_STRING);
        if (array_key_exists(0, $dumpFiles)) {
            /** @noinspection PhpUndefinedVariableInspection */
            $lastDumpPath = preg_replace('/\\.zip$/', '', $dumpFiles[0], count: $count);
            if ($count === 1) {
                return $lastDumpPath;
            }
            FatalExceptionFactory::unexpected()->setMessage("Invalid dump name: $lastDumpPath")->throw();
        }
        return null;
    }

    public static function lastDumpDatetime(): ?DateTimeImmutable
    {
        $lastDumpPath = self::lastDumpName();
        if ($lastDumpPath === null) {
            return null;
        }
        /** @var ?DateTimeImmutable $datetime */
        $datetime = null;
        if (preg_match('/-([0-9]{8}-[0-9]{6})$/', $lastDumpPath, $matches)) {
            $datetime = DateTimeImmutable::createFromFormat(self::DUMP_DATETIME_FORMAT, $matches[1]) ?: null;
        }
        if ($datetime === null) {
            FatalExceptionFactory::unexpected()->setMessage("Invalid dump datetime: $lastDumpPath")->throw();
        }
        return $datetime;
    }

    public static function getDatabaseDumpsPath(): string
    {
        return App::databasePath('dumps');
    }

    public static function getDatabaseName(): string
    {
        return DB::getDatabaseName();
    }
}
