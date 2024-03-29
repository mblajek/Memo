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
        Schema::table('attributes', function (Blueprint $table) {
            $table->dropColumn('model');
        });

        Schema::create('values', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();

            $table->char('attribute_id', 36)->collation('ascii_bin');
            $table->char('object_id', 36)->collation('ascii_bin');

            $table->char('ref_dict_id', 36)->collation('ascii_bin')->nullable();
            $table->char('ref_object_id', 36)->collation('ascii_bin')->nullable();
            $table->string('string_value')->nullable();
            $table->integer('int_value')->nullable();
            $table->dateTime('datetime_value')->nullable();

            $table->char('created_by', 36)->collation('ascii_bin');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->foreign('attribute_id')->references('id')->on('attributes');
            $table->index('object_id');
            $table->foreign('ref_dict_id')->references('id')->on('positions');
            $table->index('ref_object_id');
            $table->foreign('created_by')->references('id')->on('users');
        });

        $date = '2023-11-22 00:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        $durationMinutesAttributeId = '540e2b26-1330-42ae-8209-55cf22bb3638';
        $categoryAttributeId = 'c9ab3795-0012-4cfe-8100-a7bb1dd9755b';
        $positionAttributesAttributeId = 'c97a3c3b-7faa-4f51-9113-2390ebaba700';
        $meetingTypeDictionaryId = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';
        $meetingCategoryDictionaryId = 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b';
        $otherMeetingTypePositionId = '6e87acd5-70a0-4051-963b-42d439f44e42';
        $otherMeetingCategoryPositionId = '137205e2-e9a1-4f8f-ada2-555319506b28';
        DB::table('attributes')->upsert([
            [
                'id' => $durationMinutesAttributeId,
                'facility_id' => null,
                'table' => 'positions',
                'name' => 'duration_minutes',
                'api_name' => 'duration_minutes',
                'type' => 'int',
                'dictionary_id' => null,
                'default_order' => 2,
                'is_multi_value' => 0,
                'requirement_level' => 'empty',
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => $categoryAttributeId,
                'facility_id' => null,
                'table' => 'positions',
                'name' => 'category',
                'api_name' => 'category_dict_id',
                'type' => 'dict',
                'dictionary_id' => $meetingCategoryDictionaryId,
                'default_order' => 1,
                'is_multi_value' => 0,
                'requirement_level' => 'empty',
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => $positionAttributesAttributeId,
                'facility_id' => null,
                'table' => 'dictionaries',
                'name' => 'position_required_attributes',
                'api_name' => 'position_required_attributes',
                'type' => 'attributes',
                'dictionary_id' => null,
                'default_order' => 1,
                'is_multi_value' => 1,
                'requirement_level' => 'optional',
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('values')->upsert([
            [
                'id' => '2a58e858-721b-4e8c-8d18-f419c408fc42',
                'attribute_id' => $positionAttributesAttributeId,
                'object_id' => $meetingTypeDictionaryId,
                'ref_dict_id' => null,
                'ref_object_id' => $durationMinutesAttributeId,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '2b623b96-9299-48af-9605-9998f03d2e21',
                'attribute_id' => $durationMinutesAttributeId,
                'object_id' => $otherMeetingTypePositionId,
                'ref_dict_id' => null,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => 45,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '69acb967-8f0d-4404-bcfd-83d22e6b2e3b',
                'attribute_id' => $categoryAttributeId,
                'object_id' => $otherMeetingTypePositionId,
                'ref_dict_id' => $otherMeetingCategoryPositionId,
                'ref_object_id' => null,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'b97bf226-359c-42a7-b3a9-4fa2accdf18d',
                'attribute_id' => $positionAttributesAttributeId,
                'object_id' => $meetingTypeDictionaryId,
                'ref_dict_id' => null,
                'ref_object_id' => $categoryAttributeId,
                'string_value' => null,
                'int_value' => null,
                'datetime_value' => null,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $attributeIds = [
            '540e2b26-1330-42ae-8209-55cf22bb3638',
            'c9ab3795-0012-4cfe-8100-a7bb1dd9755b',
            'c97a3c3b-7faa-4f51-9113-2390ebaba700',
        ];
        DB::table('values')->whereIn('attribute_id', $attributeIds)->delete();
        DB::table('attributes')->whereIn('id', $attributeIds)->delete();

        Schema::dropIfExists('values');
        Schema::table('attributes', function (Blueprint $table) {
            $table->string('model', 36)->collation('ascii_bin')->nullable(); // wasn't nullable
        });
    }
};
