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
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->boolean('is_extendable')->nullable(false)->default(false);
        });

        Schema::table('dictionaries', function (Blueprint $table) {
            $table->boolean('is_extendable')->nullable(false)->change();
        });

        Schema::table('positions', function (Blueprint $table) {
            $table->boolean('is_disabled')->nullable(false)->default(false);
        });

        Schema::table('positions', function (Blueprint $table) {
            $table->boolean('is_disabled')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->dropColumn('is_extendable');
        });

        Schema::table('positions', function (Blueprint $table) {
            $table->dropColumn('is_disabled');
        });
    }
};
