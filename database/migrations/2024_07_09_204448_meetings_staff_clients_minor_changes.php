<?php

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('meetings', 'deleted_at')) {
            Schema::table('meetings', function (Blueprint $table) {
                $table->dropForeign(['from_meeting_id']);
                $table->dropIndex('meetings_from_meeting_id_foreign');
                $table->index(['from_meeting_id']);
            });
            $deletedIds = DB::table('meetings')->whereNotNull('deleted_at')->get('id')->pluck('id')->toArray();
            DB::table('meeting_attendants')->whereIn('meeting_id', $deletedIds)->delete();
            DB::table('meeting_resources')->whereIn('meeting_id', $deletedIds)->delete();
            DB::table('meetings')->whereIn('id', $deletedIds)->delete();
            Schema::table('meetings', function (Blueprint $table) {
                $table->dropForeign(['deleted_by']);
                $table->dropColumn('deleted_by');
                $table->dropColumn('deleted_at');
            });
        }
        Schema::table('staff_members', function (Blueprint $table) {
            $table->dateTime('deactivated_at')->nullable();
        });
        Schema::table('clients', function (Blueprint $table) {
            DMH::ascii($table, 'short_code')->nullable();
        });
        DB::table('clients')->update(['short_code' => '-']);
        Schema::table('clients', function (Blueprint $table) {
            DMH::ascii($table, 'short_code')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('short_code');
        });
        Schema::table('staff_members', function (Blueprint $table) {
            $table->dropColumn('deactivated_at');
        });
    }
};
