<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        $date = '2024-03-11 00:00:00';

        $clientTypeDictionary = '931d1276-3e20-4348-a7d1-ccde6705ae1d';

        DB::table('dictionaries')->upsert([
            [
                'id' => $clientTypeDictionary,
                'name' => 'clientType',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('positions')->upsert([
            [
                'id' => '9c5b47e5-d0ea-4604-a903-858462cb51a8',
                'dictionary_id' => $clientTypeDictionary,
                'name' => 'child',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 1,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'd1c57dfc-c118-49ff-ae38-6585645349ca',
                'dictionary_id' => $clientTypeDictionary,
                'name' => 'caregiver',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 2,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::statement("update `attributes` set `default_order` = `default_order` + 1 where `table` = 'clients'");
        DB::table('attributes')->where('id', '1d6d5712-1a8a-4600-ab32-e0f3f8f3dbbb')
            ->update(['api_name' => 'data_zgloszenia_u1d6d5712']);
        DB::table('attributes')->where('id', '1f628171-278b-4579-89e8-a21693e04c77')
            ->update(['api_name' => 'wiek_w_momencie_zgloszenia_u1f628171']);
        DB::table('attributes')->where('id', 'e887624b-6a0f-421a-a3b8-29a1494c8d77')
            ->update(['api_name' => 'wojewodztwo_ue887624b']);
        DB::table('attributes')->where('id', 'bf7329bc-bd7a-4e69-8b3e-18d77247a65a')
            ->update(['api_name' => 'decyzja_zespolu_klinicznego_ubf7329bc']);
        DB::table('attributes')->where('id', 'c97a3c3b-7faa-4f51-9113-2390ebaba700')
            ->update(['api_name' => 'position_required_attribute_ids']);

        DB::table('attributes')->upsert(
            array_map(fn(array $data) => $data + [
                    'facility_id' => null,
                    'table' => 'clients',
                    'created_at' => $date,
                    'updated_at' => $date,
                    'is_fixed' => false,
                ], [
                [
                    'id' => 'b9685bc6-ab47-42bd-99e8-68badf0c1291',
                    'name' => 'client_type',
                    'api_name' => 'client_type_dict_id',
                    'type' => 'dict',
                    'dictionary_id' => $clientTypeDictionary,
                    'default_order' => 1,
                    'is_multi_value' => false,
                    'requirement_level' => 'required',
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
        DB::statement("update `attributes` set `default_order` = `default_order` - 1 where `table` = 'clients'");
    }
};
