<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    private string $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';
    private string $startDate = '2023-03-08 00:00:00';

    public function up(): void
    {

        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
            $table->char('created_by', 36)->collation('ascii_bin')->nullable();
        });

        DB::statement("insert into users (id, name, email) values ('$this->systemUserId', 'system', 'system')");
        DB::statement("update users set created_by = '$this->systemUserId'");
        DB::statement("update users set created_at = '$this->startDate' where created_at is null");
        DB::statement("update users set updated_at = '$this->startDate' where updated_at is null");

        Schema::table('users', function (Blueprint $table) {
            $table->char('created_by', 36)->collation('ascii_bin')->change();
            $table->dateTime('created_at')->change();
            $table->dateTime('updated_at')->change();
            $table->foreign('created_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //no password not null column change
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn('created_by');
            $table->dateTime('created_at')->nullable()->change();
            $table->dateTime('updated_at')->nullable()->change();
        });
        DB::statement("delete from users where id = '$this->systemUserId'");
    }
};
