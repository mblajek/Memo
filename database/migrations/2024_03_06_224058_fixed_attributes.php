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
        DB::table('attributes')
            ->where('id', 'c005ade5-2d01-4576-b050-93c9e7251518')->update(['requirement_level' => 'required']);

        Schema::table('attributes', function (Blueprint $table) {
            $table->boolean('is_fixed')->nullable();
        });

        DB::statement(
            "update attributes set is_fixed = case when id = '0e56d086-5bf7-46c0-8359-38e9edf8c627'
            then false else true end"
        );

        Schema::table('attributes', function (Blueprint $table) {
            $table->boolean('is_fixed')->change();
        });

        Schema::table('values', function (Blueprint $table) {
            $table->string('string_value', 4096)->nullable()->change();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->date('birth_date')->nullable();
            $table->string('notes', 4096)->nullable();
        });

        $timestamp = '2024-03-08 00:00:00';
        DB::table('attributes')->upsert(
            array_map(fn(array $data) => $data + [
                    'facility_id' => null,
                    'table' => 'clients',
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                    'is_fixed' => false,
                ], [
                [
                    'id' => 'a8f3fc00-cda2-4ce0-8bd4-12c223944191',
                    'name' => 'notes',
                    'api_name' => 'notes',
                    'type' => 'text',
                    'dictionary_id' => null,
                    'default_order' => 2,
                    'is_multi_value' => null,
                    'requirement_level' => 'optional',
                ],
                [
                    'id' => '7a678df3-c9b1-4133-9520-d388c823a186',
                    'name' => 'birth_date',
                    'api_name' => 'birth_date',
                    'type' => 'date',
                    'dictionary_id' => null,
                    'default_order' => 3,
                    'is_multi_value' => null,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => '1d6d5712-1a8a-4600-ab32-e0f3f8f3dbbb',
                    'name' => '+Data zgłoszenia',
                    'api_name' => 'data_zgloszenia_1d6d5712',
                    'type' => 'date',
                    'dictionary_id' => null,
                    'default_order' => 4,
                    'is_multi_value' => false,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => '1f628171-278b-4579-89e8-a21693e04c77',
                    'name' => '+Wiek w momencie zgłoszenia',
                    'api_name' => 'wiek_w_momencie_zgloszenia_1f628171',
                    'type' => 'int',
                    'dictionary_id' => null,
                    'default_order' => 5,
                    'is_multi_value' => false,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => 'e887624b-6a0f-421a-a3b8-29a1494c8d77',
                    'name' => '+Województwo',
                    'api_name' => 'wojewodztwo_e887624b',
                    'type' => 'dict',
                    'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                    'default_order' => 6,
                    'is_multi_value' => false,
                    'requirement_level' => 'recommended',
                ],
                [
                    'id' => 'bf7329bc-bd7a-4e69-8b3e-18d77247a65a',
                    'name' => '+Decyzja zespołu klinicznego',
                    'api_name' => 'decyzja_zespolu_klinicznego_bf7329bc',
                    'type' => 'text',
                    'dictionary_id' => null,
                    'default_order' => 7,
                    'is_multi_value' => false,
                    'requirement_level' => 'recommended',
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
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('birth_date');
            $table->dropColumn('notes');
        });

        Schema::table('attributes', function (Blueprint $table) {
            $table->dropColumn('is_fixed');
        });
    }
};
