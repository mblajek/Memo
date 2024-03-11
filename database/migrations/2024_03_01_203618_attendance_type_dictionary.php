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
        $date = '2024-03-01 00:00:00';

        $attendanceTypeDictionary = '1f68adf4-e0b7-495b-a6ea-305987cf2a33';

        DB::table('dictionaries')->upsert([
            [
                'id' => $attendanceTypeDictionary,
                'name' => 'attendanceType',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('positions')->upsert([
            [
                'id' => '6e1bad86-8b69-43ac-81c1-82f564f2ffb8',
                'dictionary_id' => $attendanceTypeDictionary,
                'name' => 'staff',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 1,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'e2d3c06c-ea2d-4808-adca-6be2c1ea23c2',
                'dictionary_id' => $attendanceTypeDictionary,
                'name' => 'client',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 2,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->char('attendance_type_dict_id', 36)->collation('ascii_bin')->nullable();
        });

        DB::statement(
            <<<"SQL"
            update meeting_attendants inner join positions on meeting_attendants.attendance_type = positions.name
            and positions.dictionary_id = '$attendanceTypeDictionary' set attendance_type_dict_id = positions.id
SQL
        );

        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->dropColumn('attendance_type');
            $table->char('attendance_type_dict_id', 36)->collation('ascii_bin')->change();

            $table->foreign('attendance_type_dict_id')->references('id')->on('positions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $attendanceTypeDictionary = '1f68adf4-e0b7-495b-a6ea-305987cf2a33';

        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->string('attendance_type', 36)->collation('ascii_bin')->nullable();
        });

        DB::statement(
            <<<"SQL"
            update meeting_attendants inner join positions on attendance_type_dict_id = positions.id
            and positions.dictionary_id = '$attendanceTypeDictionary' set meeting_attendants.attendance_type = positions.name
        SQL);

        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->dropForeign(['attendance_type_dict_id']);
            $table->dropColumn('attendance_type_dict_id');
            $table->string('attendance_type', 36)->collation('ascii_bin')->change();
        });

        DB::table('positions')
            ->whereIn('id', ['6e1bad86-8b69-43ac-81c1-82f564f2ffb8', 'e2d3c06c-ea2d-4808-adca-6be2c1ea23c2'])
            ->delete();
        DB::table('dictionaries')->where('id', '1f68adf4-e0b7-495b-a6ea-305987cf2a33')->delete();
    }
};
