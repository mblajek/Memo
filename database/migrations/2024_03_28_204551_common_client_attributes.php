<?php

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
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
        if (Schema::hasColumn('clients', 'type_dict_id')) {
            // non-reversable migration
            return;
        }

        $clientTypeAttribute = 'b9685bc6-ab47-42bd-99e8-68badf0c1291';
        $clientTypeAdult = 'd1c57dfc-c118-49ff-ae38-6585645349ca';
        $attributesToDelete = [
            '1d6d5712-1a8a-4600-ab32-e0f3f8f3dbbb',//+data zgłoszenia
            '1f628171-278b-4579-89e8-a21693e04c77',//+wiek w momencie zgłoszenia
            'e887624b-6a0f-421a-a3b8-29a1494c8d77',//+województwo
            'bf7329bc-bd7a-4e69-8b3e-18d77247a65a',//+decyzja zespołu klinicznego
        ];
        $meetingTypeDictionary = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';
        $meetingTypeOther = '6e87acd5-70a0-4051-963b-42d439f44e42';
        $meetingCategoryDictionary = 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b';
        $meetingCategoryOther = '137205e2-e9a1-4f8f-ada2-555319506b28';
        $date = '2024-03-28 00:00:00';

        $notificationMethodDictionary = '99e5b807-933d-4fd7-b2d9-3a5350b83cab';

        // rename caregiver to adult
        DB::table('positions')->where('id', $clientTypeAdult)->update(['name' => 'adult']);
        // extendable gender dictionary
        DB::table('dictionaries')->where('id', 'c21c1557-4617-42ae-ad20-12f8f89fb12b')
            ->update(['is_extendable' => true]);

        // delete global non-fixed attributes values and attributes and move default order of existing
        DB::table('values')->whereIn('attribute_id', $attributesToDelete)->delete();
        DB::table('attributes')->whereIn('id', $attributesToDelete)->delete();
        DB::statement(
            "update `attributes` set `default_order` = `default_order` + 5 where `table` = 'clients'"
            . " and `default_order` > 4 order by `default_order` desc"
        );
        // notification method dictionary
        DB::table('dictionaries')->upsert([
            [
                'id' => $notificationMethodDictionary,
                'name' => 'notificationMethod',
                'is_fixed' => true,
                'is_extendable' => false,
                'created_by' => DMH::USER_SYSTEM,
                'updated_by' => DMH::USER_SYSTEM,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');
        DB::table('positions')->upsert([
            [
                'id' => '35a4c273-44b8-4039-a79f-391213973f58',
                'dictionary_id' => $notificationMethodDictionary,
                'name' => 'sms',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 1,
                'created_by' => DMH::USER_SYSTEM,
                'updated_by' => DMH::USER_SYSTEM,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');
        // fixed attributes: contact_email, contact_phone, address_street_number, address_postal_code, address_city
        // contact_start_at, contact_end_at, documents_links, notification_methods
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
                    'id' => '50e76d71-bcad-473f-983b-3e9f5e00d6f7',
                    'name' => 'contact_email',
                    'api_name' => 'contact_email',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 5,
                    'is_multi_value' => null,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => '9722feb5-f804-4ac9-8d8d-6ebc319da50d',
                    'name' => 'contact_phone',
                    'api_name' => 'contact_phone',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 6,
                    'is_multi_value' => null,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => 'fd077aac-4341-480c-a27a-0695ad152339',
                    'name' => 'address_street_number',
                    'api_name' => 'address_street_number',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 7,
                    'is_multi_value' => null,
                    'requirement_level' => 'optional',
                ],
                [
                    'id' => 'dc0fca68-93e6-4d82-af31-36d00fd9ae83',
                    'name' => 'address_postal_code',
                    'api_name' => 'address_postal_code',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 8, //was: +decyzja zespołu klinicznego
                    'is_multi_value' => null,
                    'requirement_level' => 'optional',
                ],
                [
                    'id' => 'd90522a3-960b-4217-af88-b636fcd3d349',
                    'name' => 'address_city',
                    'api_name' => 'address_city',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 9,
                    'is_multi_value' => null,
                    'requirement_level' => 'optional',
                ],
                [
                    'id' => 'a783d287-26de-4566-9314-64d3eb285037',
                    'name' => 'contact_start_at',
                    'api_name' => 'contact_start_at',
                    'type' => 'date',
                    'dictionary_id' => null,
                    'default_order' => 10,
                    'is_multi_value' => null,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => 'c2f0dda4-68b3-481b-aa25-62595caa40fd',
                    'name' => 'contact_end_at',
                    'api_name' => 'contact_end_at',
                    'type' => 'date',
                    'dictionary_id' => null,
                    'default_order' => 11,
                    'is_multi_value' => null,
                    'requirement_level' => 'optional',
                ],
                [
                    'id' => 'e1c14100-070d-4213-8927-6b7aed9617a4',
                    'name' => 'documents_links',
                    'api_name' => 'documents_links',
                    'type' => 'string',
                    'dictionary_id' => null,
                    'default_order' => 12,
                    'is_multi_value' => true,
                    'requirement_level' => 'optional',
                ],
                [
                    'id' => 'c0742816-fb80-46de-b7d9-374e4057a2e3',
                    'name' => 'notification_methods',
                    'api_name' => 'notification_method_dict_ids',
                    'type' => 'dict',
                    'dictionary_id' => $notificationMethodDictionary,
                    'default_order' => 13,
                    'is_multi_value' => true,
                    'requirement_level' => 'optional',
                ],
            ]),
            'id'
        );
        Schema::table('clients', function (Blueprint $table) {
            DMH::charUuid($table, 'type_dict_id')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('address_street_number')->nullable();
            $table->string('address_postal_code')->nullable();
            $table->string('address_city')->nullable();
            $table->date('contact_start_at')->nullable();
            $table->date('contact_end_at')->nullable();
            // missing
            $table->foreign('gender_dict_id')->references('id')->on('positions');
        });
        // move client.type_dict_id from multi=false to multi=null attribute
        foreach (DB::table('values')->where('attribute_id', $clientTypeAttribute)->get() as $value) {
            DB::table('clients')->where('id', $value->object_id)->update(['type_dict_id' => $value->ref_dict_id]);
        }
        DB::table('clients')->whereNull('type_dict_id')->update(['type_dict_id' => $clientTypeAdult]);
        Schema::table('clients', function (Blueprint $table) {
            DMH::charUuid($table, 'type_dict_id')->change();
            $table->foreign('type_dict_id')->references('id')->on('positions');
        });
        DB::table('attributes')->where('id', $clientTypeAttribute)
            ->update(['is_multi_value' => null, 'name' => 'type', 'api_name' => 'type_dict_id']);
        DB::table('values')->where('attribute_id', $clientTypeAttribute)->delete();
        // remove global meeting types and categories other than "other"
        foreach (
            DB::table('positions')->where('dictionary_id', $meetingCategoryDictionary)
                ->where('is_fixed', 0)->whereNull('facility_id')->get() as $meetingCategory
        ) {
            DB::table('values')->where('object_id', $meetingCategory->id)
                ->orWhere('ref_dict_id', $meetingCategory->id)->delete();
            DB::statement(
                "update `meetings` set `notes` = trim(concat(?, char(10), coalesce(`notes`, ''))),"
                . " `category_dict_id` = ? where category_dict_id = ?",
                [ltrim($meetingCategory->name, '+'), $meetingCategoryOther, $meetingCategory->id],
            );
        }
        foreach (
            DB::table('positions')->where('dictionary_id', $meetingTypeDictionary)
                ->where('is_fixed', 0)->whereNull('facility_id')->get() as $meetingType
        ) {
            DB::table('values')->where('object_id', $meetingType->id)
                ->orWhere('ref_dict_id', $meetingType->id)->delete();
            DB::statement(
                "update `meetings` set `notes` = trim(concat(?, char(10), coalesce(`notes`, ''))),"
                . " `type_dict_id` = ? where type_dict_id = ?",
                [ltrim($meetingType->name, '+'), $meetingTypeOther, $meetingType->id],
            );
        }
        DB::table('meetings')->where('notes', '')->update(['notes' => null]);
        DB::table('positions')->where('dictionary_id', $meetingCategoryDictionary)
            ->where('is_fixed', 0)->whereNull('facility_id')->delete();
        DB::table('positions')->where('dictionary_id', $meetingTypeDictionary)
            ->where('is_fixed', 0)->whereNull('facility_id')->delete();

        DB::table('attributes')->whereIn('id', [
            '0e56d086-5bf7-46c0-8359-38e9edf8c627',//client.gender
            '7a678df3-c9b1-4133-9520-d388c823a186',//client.birth_date
            'a8f3fc00-cda2-4ce0-8bd4-12c223944191',//client.notes
            'b9685bc6-ab47-42bd-99e8-68badf0c1291',//client.type
        ])->update(['is_fixed' => true]);

        Schema::table('users', function (Blueprint $table) {
            DMH::charUuid($table, 'managed_by_facility_id')->nullable();
            $table->foreign('managed_by_facility_id')->references('id')->on('facilities');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
