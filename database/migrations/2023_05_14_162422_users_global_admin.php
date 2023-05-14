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
        Schema::create('grants', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('created_by', 36)->collation('ascii_bin');
            $table->foreign('created_by')->references('id')->on('users');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->char('global_admin_grant_id', 36)->collation('ascii_bin')->nullable();
            $table->foreign('global_admin_grant_id')->references('id')->on('grants')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['global_admin_grant_id']);
            $table->dropColumn('global_admin_grant_id');
        });
        Schema::dropIfExists('grants');
    }
};
