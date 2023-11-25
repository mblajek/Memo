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
        $meetingStatusDictionaryId = '3865a3c3-0038-4668-9d55-5d05b79d7fcd';
        $attendanceStatusDictionaryId = 'a2874757-aca7-4c16-a0dc-2fc368f795fb';

        $date = '2022-11-25 00:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        //@formatter:off
        $items = [
            ['id' => '86aaead1-bbcc-4af1-a74a-ed2bdff46d0a', 'dictionary_id' => $meetingStatusDictionaryId, 'name' => 'planned', 'default_order' => 1],
            ['id' => 'f6001030-c061-480e-9a5a-7013cee7ff40', 'dictionary_id' => $meetingStatusDictionaryId, 'name' => 'completed', 'default_order' => 2],
            ['id' => 'fb3ffe88-f8c1-455b-a4d6-2448d6cfaaf5', 'dictionary_id' => $meetingStatusDictionaryId, 'name' => 'cancelled', 'default_order' => 3],
            ['id' => '1adb737f-da0f-4473-ab9c-55fc1634b397', 'dictionary_id' => $attendanceStatusDictionaryId, 'name' => 'present', 'default_order' => 1],
            ['id' => 'f39903be-45b2-4e85-a3cb-aada4e81b9be', 'dictionary_id' => $attendanceStatusDictionaryId, 'name' => 'absent', 'default_order' => 2],
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

        Schema::table('meetings', function (Blueprint $table) {
            $table->boolean('is_remote');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->dropColumn('is_remote');
        });
    }
};
