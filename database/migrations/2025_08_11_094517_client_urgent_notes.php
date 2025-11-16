<?php
/** @noinspection PhpUnusedAliasInspection */

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        $date = '2025-08-11 00:00:00';
        DB::statement(
            "update `attributes` set `default_order` = `default_order` + 1"
            ." where `table` = 'clients' and `default_order` >= 5" // after notes
            ." order by `default_order` desc"
        );
        DB::table('attributes')->insert(
            array_map(fn(array $data) => $data + [
                    'facility_id' => null,
                    'table' => 'clients',
                    'created_at' => $date,
                    'updated_at' => $date,
                    'created_by' => DMH::USER_SYSTEM,
                    'updated_by' => DMH::USER_SYSTEM,
                    'is_fixed' => true,
                ], [
                [
                    'id' => '3217bb30-58a3-40c0-8f02-313f195cd459',
                    'name' => 'urgent_notes',
                    'api_name' => 'urgent_notes',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 5,
                    'is_multi_value' => true,
                    'requirement_level' => 'optional',
                ]
            ])
        );

    }

    public function down(): void
    {
        DB::table('attributes')->delete('3217bb30-58a3-40c0-8f02-313f195cd459');
        DB::statement(
            "update `attributes` set `default_order` = `default_order` - 1"
            ." where `table` = 'clients' and `default_order` >= 5"
            ." order by `default_order` asc"
        );

    }
};
