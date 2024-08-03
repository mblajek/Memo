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
        DB::table('dictionaries')->where('id', '3865a3c3-0038-4668-9d55-5d05b79d7fcd')
            ->update(['is_extendable' => false]); // meeting status
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
