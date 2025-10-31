<?php
/** @noinspection PhpUnusedAliasInspection */

use App\Console\Commands\DatabaseCollationCommand;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        if (Schema::hasTable('timetables')) {
            Schema::table('facilities', function (Blueprint $table) {
                $table->dropForeign(['timetable_id']);
                $table->dropColumn('timetable_id');
            });
            Schema::table('staff_members', function (Blueprint $table) {
                $table->dropForeign(['timetable_id']);
                $table->dropColumn('timetable_id');
            });
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropForeign(['client_id']);
                $table->dropColumn('client_id');
            });
            Schema::dropIfExists('timetables');
        }

        Artisan::call(DatabaseCollationCommand::SIGNATURE);
    }


    public function down(): void
    {
        //
    }
};
