<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $date = '2024-04-10 00:00:00';
        $systemUserId = DMH::USER_SYSTEM;
        DB::table('dictionaries')->upsert([
            [
                'id' => 'a8348d97-84e6-4304-9c72-257d044c374d',
                'name' => 'positionGroup',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'updated_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::statement(
            "update `attributes` set `default_order` = `default_order` + 1 where `table` = 'positions'"
            . " and `default_order` > 2 order by `default_order` desc"
        );
        DB::table('attributes')->upsert([
            [
                'id' => 'f434e7e6-186b-40b0-82b0-8c58f9fb45fc',
                'facility_id' => null,
                'table' => 'positions',
                'name' => 'position_group',
                'api_name' => 'position_group_dict_id',
                'type' => 'dict',
                'dictionary_id' => 'a8348d97-84e6-4304-9c72-257d044c374d',
                'default_order' => 3,
                'is_multi_value' => false,
                'requirement_level' => 'optional',
                'is_fixed' => true,
                'created_by' => $systemUserId,
                'updated_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('positions')->where('id', '2903ea34-6188-4972-b84c-d3dc4047ee3c')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 1]);
        DB::table('positions')->where('id', 'c47b1483-cef9-4f5f-bc89-419104cc55d9')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 1]);
        DB::table('positions')->where('id', '137205e2-e9a1-4f8f-ada2-555319506b28')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 2]);
        DB::table('positions')->where('id', 'efaf3dbb-d5d1-481b-9724-0f23f566e1fd')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 2]);
        DB::table('positions')->where('id', '6e87acd5-70a0-4051-963b-42d439f44e42')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 3]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement(
            "update `attributes` set `default_order` = `default_order` - 1 where `table` = 'positions'"
            . " and `default_order` > 3 order by `default_order`"
        );
    }
};
