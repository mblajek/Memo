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
        Schema::table('meetings', function (Blueprint $table) {
            $table->char('updated_by', 36)->collation('ascii_bin')->nullable();
            $table->char('deleted_by', 36)->collation('ascii_bin')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('deleted_by')->references('id')->on('users')->restrictOnDelete();
        });

        DB::statement('update `meetings` set `updated_by` = `created_by`');

        Schema::table('meetings', function (Blueprint $table) {
            $table->char('updated_by', 36)->collation('ascii_bin')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->dropForeign(['updated_by']);
            $table->dropForeign(['deleted_by']);
            $table->dropColumn('updated_by');
            $table->dropColumn('deleted_by');
            $table->dropColumn('deleted_at');
        });
    }
};
