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
        $pDate = '2023-11-25 00:00:00';
        DB::table('meeting_attendants')->whereNull('attendance_status_dict_id')
            ->update(['attendance_status_dict_id' => '1adb737f-da0f-4473-ab9c-55fc1634b397']);
        DB::table('positions')->where('id', '1adb737f-da0f-4473-ab9c-55fc1634b397') // present
            ->update(['created_at' => $pDate, 'updated_at' => $pDate, 'name' => 'ok', 'default_order' => 1]);
        DB::table('positions')->where('id', 'f39903be-45b2-4e85-a3cb-aada4e81b9be') // absent
            ->update(['created_at' => $pDate, 'updated_at' => $pDate, 'name' => 'cancelled', 'default_order' => 2]);

        $attendanceStatusDictionaryId = 'a2874757-aca7-4c16-a0dc-2fc368f795fb';

        $date = '2024-01-21 00:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        //@formatter:off
        $items = [
            ['id' => '6833fc51-39dd-4dfe-8652-ca79adc8b644', 'dictionary_id' => $attendanceStatusDictionaryId, 'name' => 'no_show', 'default_order' => 3],
            ['id' => '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b', 'dictionary_id' => $attendanceStatusDictionaryId, 'name' => 'late_present', 'default_order' => 4],
            ['id' => '40c978a9-f63a-439a-a58e-11b8513ed63d', 'dictionary_id' => $attendanceStatusDictionaryId, 'name' => 'too_late', 'default_order' => 5],
        ];
        //@formatter:on
        $positions = [];
        foreach ($items as $item) {
            $positions[] = $item + [
                    'is_fixed' => true,
                    'is_disabled' => false,
                    'created_by' => $systemUserId,
                    'created_at' => $date,
                    'updated_at' => $date,
                ];
        }

        DB::table('positions')->upsert($positions, 'id');

        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->char('attendance_status_dict_id', 36)->collation('ascii_bin')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
