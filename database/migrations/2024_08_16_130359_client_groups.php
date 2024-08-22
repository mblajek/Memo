<?php
/** @noinspection PhpUnusedAliasInspection */

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;

return new class extends Migration {

    private const string MEETING_TYPE_GROUP = 'c27b1114-f618-4698-93d1-9a6a0db2f112';
    private const string MEETING_ATTENDANCE_CLIENT = 'e2d3c06c-ea2d-4808-adca-6be2c1ea23c2';

    public function up(): void
    {
        if (Schema::hasTable('client_groups')) {
            return;
        }

        Schema::create('client_groups', function (Blueprint $table) {
            DMH::base($table);
            DMH::charUuid($table, 'facility_id');
            $table->string('notes', 4096)->nullable();
            $table->foreign('facility_id')
                ->references('id')
                ->on('facilities');
        });

        Schema::create('group_clients', function (Blueprint $table) {
            DMH::base($table);
            DMH::charUuid($table, 'client_group_id');
            DMH::charUuid($table, 'user_id');
            $table->string('role')->nullable();

            $table->unique(['client_group_id', 'user_id']);

            $table->foreign('client_group_id')->references('id')->on('client_groups');

            $table->foreign('user_id')->references('id')->on('users');
        });

        $groupMeetings = DB::table('meetings')
            ->where('type_dict_id', self::MEETING_TYPE_GROUP)
            ->get(['id', 'notes', 'facility_id', 'created_by', 'updated_by', 'created_at', 'updated_at']);
        $groupMeetingClients = DB::table('meeting_attendants')
            ->where('attendance_type_dict_id', self::MEETING_ATTENDANCE_CLIENT)
            ->whereIn('meeting_id', $groupMeetings->pluck('id'))
            ->get(['meeting_id', 'user_id', 'created_by', 'updated_by', 'created_at', 'updated_at'])
            ->groupBy('meeting_id');

        /** @var object{id: string, facility_id: string, notes: ?string, created_by: string, updated_by: string, created_at: string, updated_at: string} $groupMeeting */
        foreach ($groupMeetings as $groupMeeting) {
            $clientGroupId = Str::uuid()->toString();
            DB::table('client_groups')->insert([
                'id' => $clientGroupId,
                'facility_id' => $groupMeeting->facility_id,
                'notes' => $groupMeeting->notes,
                'created_by' => $groupMeeting->created_by,
                'updated_by' => $groupMeeting->updated_by,
                'created_at' => $groupMeeting->created_at,
                'updated_at' => $groupMeeting->updated_at,
            ]);
            /** @var object{user_id: string, created_by: string, updated_by: string, created_at: string, updated_at: string} $groupMeeting */
            foreach ($groupMeetingClients->get($groupMeeting->id, []) as $groupMeetingClient) {
                DB::table('group_clients')->insert([
                    'id' => Str::uuid()->toString(),
                    'client_group_id' => $clientGroupId,
                    'user_id' => $groupMeetingClient->user_id,
                    'created_by' => $groupMeetingClient->created_by,
                    'updated_by' => $groupMeetingClient->updated_by,
                    'created_at' => $groupMeetingClient->created_at,
                    'updated_at' => $groupMeetingClient->updated_at,
                ]);
            }
        }

        DB::table('meeting_attendants')->whereIn('meeting_id', $groupMeetings->pluck('id'))->delete();
        DB::table('meetings')->where('type_dict_id', self::MEETING_TYPE_GROUP)->delete();
        DB::table('positions')->where('id', self::MEETING_TYPE_GROUP)->delete();
    }

    public function down(): void
    {
        // one way migration
    }
};
