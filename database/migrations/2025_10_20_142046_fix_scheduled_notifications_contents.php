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
         DB::table('notifications')
            ->where('status', 'scheduled')
            ->update(['subject' => '{{meeting_facility_template_subject}}']);

         DB::table('notifications')
            ->where('status', 'scheduled')
            ->whereNotNull('message')
            ->update(['message' => '{{meeting_facility_template_message}}']);
    }

    public function down(): void
    {
        //
    }
};
