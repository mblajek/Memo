<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatabaseCollationCommand extends Command
{
    public const string SIGNATURE = 'fz:db-collation';

    protected $signature = self::SIGNATURE;
    protected $description = 'Set utf8 database columns collation from config';

    public function handle(): int
    {
        ['database' => $database, 'charset' => $charset, 'collation' => $collation] = DB::getConfig();
        $charsetCollate = "CHARACTER SET `$charset` COLLATE `$collation`";
        $statements = ["ALTER DATABASE `$database` {$charsetCollate}"];

        foreach (Schema::getTableListing(schema: $database, schemaQualified: false) as $tableName) {
            $alterTable = "ALTER TABLE `$tableName`";
            $statements[] = "$alterTable $charsetCollate";

            /** @var array{name: string, type: string, collation: ?string, nullable: bool} $column */
            foreach (Schema::getColumns($tableName) as $column) {
                if ($column['collation'] && str_starts_with($column['collation'], 'utf8')) {
                    $statements[] = "$alterTable MODIFY `{$column['name']}` {$column['type']}"
                        . " {$charsetCollate}" . ($column['nullable'] ? 'NULL' : 'NOT NULL');
                }
            }
        }
        foreach ($statements as $statement) {
            DB::statement($statement);
        }

        return self::SUCCESS;
    }
}
