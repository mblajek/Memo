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
        Schema::table('meeting_attendants', function (Blueprint $table) {
            DMH::charUuid($table, 'client_group_id')->nullable();
            $table->foreign('client_group_id')
                ->references('id')
                ->on('client_groups');
        });
    }

    public function down(): void
    {
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->dropForeign(['client_group_id']);
            $table->dropColumn('client_group_id');
        });
    }
};
