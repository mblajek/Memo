<?php

namespace App\Utils\DatabaseMigrationHelper;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ColumnDefinition;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DatabaseMigrationHelper
{
    public const string USER_SYSTEM = 'e144ff18-471f-456f-a1c2-971d88b3d213';

    public static function base(Blueprint $table): void
    {
        self::uuid($table, 'id')->primary();
        $table->dateTime('created_at');
        $table->dateTime('updated_at');
        $table->char('created_by', 36)->collation('ascii_bin');
        $table->char('updated_by', 36)->collation('ascii_bin');
        $table->foreign('created_by')->references('id')->on('users');
        $table->foreign('updated_by')->references('id')->on('users');
    }

    public static function uuid(Blueprint $table, string $name): ColumnDefinition
    {
        return $table->char($name, 36)->collation('ascii_bin');
    }
}
