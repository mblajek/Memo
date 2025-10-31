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
        if (Schema::hasTable('timetables')) {
            Schema::table('facilities', function (Blueprint $table) {
                $table->dropColumn('timetable_id');
            });
            Schema::table('staff_members', function (Blueprint $table) {
                $table->dropColumn('timetable_id');
            });
            Schema::dropIfExists('timetables');
        }
    }


    public function down(): void
    {
        //
    }
};
