<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->string('interval', 36)->collation('ascii_bin')->nullable();
            $table->char('from_meeting_id', 36)->collation('ascii_bin')->nullable();
            $table->foreign('from_meeting_id')->references('id')->on('meetings')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->dropForeign(['from_meeting_id']);
            $table->dropColumn('from_meeting_id');
            $table->dropColumn('interval');
        });
    }
};
