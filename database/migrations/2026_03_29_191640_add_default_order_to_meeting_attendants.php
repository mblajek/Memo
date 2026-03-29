<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->integer('default_order')->nullable();
        });

        DB::table('meeting_attendants')->update(['default_order' => 0]);

        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->integer('default_order')->change();
        });
    }

    public function down(): void
    {
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->dropColumn('default_order');
        });
    }
};
