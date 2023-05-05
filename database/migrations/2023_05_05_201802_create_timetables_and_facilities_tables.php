<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('timetables', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->timestamps();
        });

        Schema::create('facilities', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->string('name');
            $table->string('url');
            $table->char('timetable_id', 36)->collation('ascii_bin')->nullable();
            $table->timestamps();

            $table->foreign('timetable_id')
                ->references('id')
                ->on('timetables')
                ->onDelete('set null');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->char('last_login_facility_id', 36)->collation('ascii_bin')->nullable();

            $table->foreign('last_login_facility_id')
                ->references('id')
                ->on('facilities')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('timetables');
        Schema::dropIfExists('facilities');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['last_login_facility_id']);
            $table->dropColumn('last_login_facility_id');
        });
    }
};
