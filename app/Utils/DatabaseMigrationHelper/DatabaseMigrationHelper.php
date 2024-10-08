<?php

namespace App\Utils\DatabaseMigrationHelper;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ColumnDefinition;

// use Illuminate\Support\Facades\DB;
// use Illuminate\Support\Facades\Schema;

final class DatabaseMigrationHelper
{
    public const string USER_SYSTEM = 'e144ff18-471f-456f-a1c2-971d88b3d213';
    public const int SYSTEM_ORDER_OFFSET = 1_000_000;

    public static function base(Blueprint $table): void
    {
        self::charUuid($table, 'id')->primary();
        $table->dateTime('created_at');
        $table->dateTime('updated_at');
        self::charUuid($table, 'created_by');
        self::charUuid($table, 'updated_by');
        $table->foreign('created_by')->references('id')->on('users');
        $table->foreign('updated_by')->references('id')->on('users');
    }

    public static function charUuid(Blueprint $table, string $name): ColumnDefinition
    {
        return $table->char($name, 36)->collation('ascii_bin');
    }

    public static function ascii(Blueprint $table, string $name, int $length = 36): ColumnDefinition
    {
        return $table->string($name, $length)->collation('ascii_bin');
    }
}
