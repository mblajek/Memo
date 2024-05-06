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
        DB::table('dictionaries')->where('id', '1f68adf4-e0b7-495b-a6ea-305987cf2a33')
            ->update(['is_extendable' => false]); // attendance type
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
