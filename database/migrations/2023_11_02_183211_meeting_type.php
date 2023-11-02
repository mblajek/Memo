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
        $this->down();

        $date = '2023-11-02 00:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
        DB::table('dictionaries')->upsert([
            [
                'id' => 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b',
                'name' => 'meetingCategory',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0',
                'name' => 'meetingType',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');

        DB::table('positions')->upsert([
            [
                'id' => '137205e2-e9a1-4f8f-ada2-555319506b28',
                'dictionary_id' => 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b',
                'name' => 'other',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 1,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '6e87acd5-70a0-4051-963b-42d439f44e42',
                'dictionary_id' => '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0',
                'name' => 'other',
                'is_fixed' => true,
                'is_disabled' => false,
                'default_order' => 1,
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
        DB::table('positions')->where('dictionary_id', 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b')->delete();
        DB::table('dictionaries')->delete('ce12aa23-a5db-49f3-987b-d2db3ab24a3b');

        DB::table('positions')->where('dictionary_id', '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0')->delete();
        DB::table('dictionaries')->delete('4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0');
    }
};
