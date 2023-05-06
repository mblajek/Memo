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
        Schema::table('users', function (Blueprint $table) {
            // should be already this type
            $table->dateTime('created_at')->change();
            $table->dateTime('updated_at')->change();
            // just change timestamp to datetime
            $table->dateTime('email_verified_at')->nullable()->change();
        });
        Schema::table('facilities', function (Blueprint $table) {
            $table->string('url', 18)->collation('ascii_bin')->change();
            $table->dateTime('created_at')->change();
            $table->dateTime('updated_at')->change();
        });
        Schema::table('timetables', function (Blueprint $table) {
            $table->dateTime('created_at')->change();
            $table->dateTime('updated_at')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //restore to nullable datetime
        Schema::table('facilities', function (Blueprint $table) {
            $table->string('url')->change();
            $table->dateTime('created_at')->nullable()->change();
            $table->dateTime('updated_at')->nullable()->change();
        });
        Schema::table('timetables', function (Blueprint $table) {
            $table->dateTime('created_at')->nullable()->change();
            $table->dateTime('updated_at')->nullable()->change();
        });
    }
};
