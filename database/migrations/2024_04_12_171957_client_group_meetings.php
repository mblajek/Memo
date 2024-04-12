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
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->string('info')->nullable();
        });

        $typeDictionaryId = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';
        $systemUserId = DMH::USER_SYSTEM;
        $systemCategoryId = '2903ea34-6188-4972-b84c-d3dc4047ee3c';
        $clientsGroupTemporaryId = 'c27b1114-f618-4698-93d1-9a6a0db2f112';
        $date = '2024-04-12 00:00:00';
        DB::table('positions')->upsert([
            [
                'id' => $clientsGroupTemporaryId,
                'dictionary_id' => $typeDictionaryId,
                'name' => 'clients_group_temporary',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => DMH::SYSTEM_ORDER_OFFSET + 4,
                'created_by' => $systemUserId,
                'updated_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');
        DB::table('values')->upsert([
            [
                'id' => 'fd8ca703-ae3a-4b1b-b7d5-f02c1b884cf0',
                'attribute_id' => '540e2b26-1330-42ae-8209-55cf22bb3638',
                'object_id' => $clientsGroupTemporaryId,
                'ref_dict_id' => null,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => 0,
                'datetime_value' => null,
                'default_order' => 1,
                'created_by' => $systemUserId,
                'updated_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '5319a8f2-ca76-4065-a3e3-a6afa9f8a946',
                'attribute_id' => 'c9ab3795-0012-4cfe-8100-a7bb1dd9755b',
                'object_id' => $clientsGroupTemporaryId,
                'ref_dict_id' => $systemCategoryId,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'default_order' => 1,
                'created_by' => $systemUserId,
                'updated_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('positions')->where('id', '137205e2-e9a1-4f8f-ada2-555319506b28')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 3]);
        DB::table('positions')->where('id', '2903ea34-6188-4972-b84c-d3dc4047ee3c')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 2]);
        DB::table('positions')->where('id', '137205e2-e9a1-4f8f-ada2-555319506b28')
            ->update(['default_order' => DMH::SYSTEM_ORDER_OFFSET + 1]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->dropColumn('info');
        });
    }
};
