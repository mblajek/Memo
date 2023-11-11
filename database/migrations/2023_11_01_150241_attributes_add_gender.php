<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private string $genderAttributeId = '0e56d086-5bf7-46c0-8359-38e9edf8c627';
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
        $timestamp = '2023-11-01 00:00:00';
        // Add row to attributes table
        DB::table('attributes')->upsert([
            'id' => $this->genderAttributeId,
            'facility_id' => null,
            'table' => 'clients',
            'model' => 'client',
            'name' => 'gender',
            'api_name' => $this->gender_column_name,
            'type' => 'dict',
            'dictionary_id' => $genderDictionaryId,
            'default_order' => 1,
            'is_multi_value' => null,
            'requirement_level' => 'recommended',
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ], 'id');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('attributes')->delete($this->genderAttributeId);

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn($this->gender_column_name);
        });
    }
};
