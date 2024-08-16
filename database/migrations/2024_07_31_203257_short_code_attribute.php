<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $date = '2024-07-31 00:00:00';
        Schema::table('attributes', function (Blueprint $table) {
            $table->string('description', 4096)->nullable();
        });
        DB::statement(
            "update `attributes` set `default_order` = `default_order` + 1 where `table` = 'clients'"
            ." order by `default_order` desc"
        );
        DB::table('attributes')->upsert(
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
                    'id' => 'f28a6833-2369-4b41-a005-23aee3c31b22',
                    'name' => 'short_code',
                    'api_name' => 'short_code',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 1,
                    'is_multi_value' => null,
                    'requirement_level' => 'optional',
                ]
            ]),
            'id'
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("update `attributes` set `default_order` = `default_order` - 1 where `table` = 'clients'"
            ." order by `default_order`");
        Schema::table('attributes', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
