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
        // "other" meeting category
        DB::table('positions')->where('id', '137205e2-e9a1-4f8f-ada2-555319506b28')
            ->update(['is_fixed' => true, 'default_order' => 99]);
        // "other" type default duration
        DB::table('values')->where('id', '2b623b96-9299-48af-9605-9998f03d2e21')
            ->update(['int_value' => 0]);

        $categoryDictionaryId = 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b';
        $typeDictionaryId = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        $systemCategoryId = '2903ea34-6188-4972-b84c-d3dc4047ee3c';
        $workTimeId = 'efaf3dbb-d5d1-481b-9724-0f23f566e1fd';
        $leaveTimeId = 'c47b1483-cef9-4f5f-bc89-419104cc55d9';
        $date = '2024-02-18 00:00:00';
        DB::table('positions')->upsert([
            [
                'id' => $systemCategoryId,
                'dictionary_id' => $categoryDictionaryId,
                'name' => 'system',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 98,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => $workTimeId,
                'dictionary_id' => $typeDictionaryId,
                'name' => 'work_time',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 998,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => $leaveTimeId,
                'dictionary_id' => $typeDictionaryId,
                'name' => 'leave_time',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 997,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('values')->upsert([
            [
                'id' => '48d0e70c-9b72-4d86-860a-137d370debed',
                'attribute_id' => '540e2b26-1330-42ae-8209-55cf22bb3638',
                'object_id' => $workTimeId,
                'ref_dict_id' => null,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => 0,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '1b9ceaf6-757c-428d-8625-499047fa785c',
                'attribute_id' => 'c9ab3795-0012-4cfe-8100-a7bb1dd9755b',
                'object_id' => $workTimeId,
                'ref_dict_id' => $systemCategoryId,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '163625d9-3e2e-48e8-becc-dbfb4771e081',
                'attribute_id' => '540e2b26-1330-42ae-8209-55cf22bb3638',
                'object_id' => $leaveTimeId,
                'ref_dict_id' => null,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => 0,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '3703d301-9533-47ae-8e3f-34236c62d22b',
                'attribute_id' => 'c9ab3795-0012-4cfe-8100-a7bb1dd9755b',
                'object_id' => $leaveTimeId,
                'ref_dict_id' => $systemCategoryId,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ]
        ], 'id');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
