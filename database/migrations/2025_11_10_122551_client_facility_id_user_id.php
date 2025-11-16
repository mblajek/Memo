<?php
/** @noinspection PhpUnusedAliasInspection */

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            DMH::charUuid($table, 'user_id')->nullable();
            DMH::charUuid($table, 'facility_id')->nullable();
            $table->unique(['user_id']); // can be replaced with ['user_id', 'facility_id'] in needed
            $table->foreign(['user_id'])->references('id')->on('users');
            $table->foreign(['facility_id'])->references('id')->on('facilities');
        });
        DB::statement(
            'update `clients` inner join `members` on `members`.`client_id` = `clients`.`id`'
            . ' set clients.user_id = members.user_id, `clients`.`facility_id` = `members`.`facility_id`',
        );
        Schema::table('clients', function (Blueprint $table) {
            DMH::charUuid($table, 'user_id')->nullable(false)->change();
            DMH::charUuid($table, 'facility_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['facility_id']);
            $table->dropColumn('user_id');
            $table->dropColumn('facility_id');
        });
    }
};
