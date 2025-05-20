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
        Schema::table('meetings', function (Blueprint $table) {
            $table->index(['from_meeting_id', 'date', 'start_dayminute']);
        });
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->index(
                ['meeting_id', 'attendance_type_dict_id', 'attendance_status_dict_id'],
                'meeting_attendants__meeting_type_status__index', // was too long
            );
        });
        Schema::table('meeting_resources', function (Blueprint $table) {
            $table->index(['meeting_id', 'resource_dict_id']);
        });
    }

    public function down(): void
    {
        Schema::table('meeting_resources', function (Blueprint $table) {
            $table->dropIndex(['meeting_id', 'resource_dict_id'])->algorithm('hash');
        });
        Schema::table('meeting_attendants', function (Blueprint $table) {
            $table->dropIndex('meeting_attendants__meeting_type_status__index');
        });
        Schema::table('meetings', function (Blueprint $table) {
            $table->dropIndex(['from_meeting_id', 'date', 'start_dayminute']);
        });
    }
};
