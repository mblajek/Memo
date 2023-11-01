<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private string $genderAttrbuteId = '0e56d086-5bf7-46c0-8359-38e9edf8c627';
    private string $gender_column_name = 'gender_dict_id';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->char($this->gender_column_name, 36)->collation('ascii_bin')->nullable();
        });
        $genderDictionaryId = 'c21c1557-4617-42ae-ad20-12f8f89fb12b';
        // Add row to attributes table
        DB::statement(<<<INSERT
            insert into attributes (
                                    id,
                                    facility_id,
                                    `table`,
                                    model,
                                    name,
                                    api_name,
                                    type,
                                    dictionary_id,
                                    default_order,
                                    is_multi_value,
                                    requirement_level,
                                    created_at,
                                    updated_at
                                    )
            values (
                    '$this->genderAttrbuteId',
                    null,
                    'clients',
                    'client',
                    'gender',
                    '$this->gender_column_name',
                    'dict',
                    '$genderDictionaryId',
                    1,
                    null,
                    'recommended',
                    CURRENT_TIMESTAMP(),
                    CURRENT_TIMESTAMP()
                    );
            INSERT
        );

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DELETE FROM attributes where id = '$this->genderAttrbuteId';");
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn($this->gender_column_name);
        });
    }
};
