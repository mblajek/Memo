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
        Schema::table('facilities', function (Blueprint $table) {
            $table->unique('url');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('global_admin_grant_id');
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
        });

        Schema::create('staff_members', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('timetable_id', 36)->collation('ascii_bin')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->foreign('timetable_id')->references('id')->on('timetables')->onDelete('set null');
        });

        Schema::create('members', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('user_id', 36)->collation('ascii_bin')->index();
            $table->char('facility_id', 36)->collation('ascii_bin')->index();
            $table->char('staff_member_id', 36)->collation('ascii_bin')->nullable()->unique();
            $table->char('client_id', 36)->collation('ascii_bin')->nullable()->unique();
            $table->char('facility_admin_grant_id', 36)->collation('ascii_bin')->nullable()->unique();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['user_id', 'facility_id']);
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('staff_member_id')->references('id')->on('staff_members')->onDelete('set null');
            $table->foreign('client_id')->references('id')->on('clients')->onDelete('set null');
            $table->foreign('facility_admin_grant_id')->references('id')->on('grants')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
        Schema::dropIfExists('staff_members');
        Schema::dropIfExists('clients');

        Schema::table('users', function (Blueprint $table) {
            // mysql cannot drop unique index when there is foreign
            $table->dropForeign(['global_admin_grant_id']);
            $table->dropUnique(['global_admin_grant_id']);
            $table->foreign('global_admin_grant_id')->references('id')->on('grants')->onDelete('set null');
        });

        Schema::table('facilities', function (Blueprint $table) {
            $table->dropUnique(['url']);
        });
    }
};
