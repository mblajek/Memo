<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    private string $meetingCategoryDictionaryId = 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b';
    private string $meetingTypeDictionaryId = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';
    private string $meetingStatusDictionaryId = '3865a3c3-0038-4668-9d55-5d05b79d7fcd';
    private string $attendanceStatusDictionaryId = 'a2874757-aca7-4c16-a0dc-2fc368f795fb';
    private string $meetingResourceDictionaryId = 'fdb0f818-aa1e-4ed9-97cc-2a3cb1b702df';
    private string $meetingCategoryAttributeId = '8111626d-130c-454d-b0c0-9fda9ab9917a';
    private string $meetingTypeAttributeId = '5f7d5e66-03f9-4bcd-a726-fde82cf98d6f';
    private string $meetingStatusAttributeId = 'e443e2c2-82fc-41d3-8fda-fe374e5329d3';
    private string $attendanceStatusAttributeId = 'c005ade5-2d01-4576-b050-93c9e7251518';
    private string $meetingResourceAttributeId = 'ff2fb31e-c992-4e2d-b543-f2768ee1c897';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('facility_id', 36)->collation('ascii_bin');
            $table->char('category_dict_id', 36)->collation('ascii_bin');
            $table->char('type_dict_id', 36)->collation('ascii_bin');
            $table->string('notes', 4096)->nullable();
            $table->date('date');
            $table->integer('start_dayminute');
            $table->integer('duration_minutes');
            $table->char('status_dict_id', 36)->collation('ascii_bin');
            $table->boolean('is_remote');

            $table->char('created_by', 36)->collation('ascii_bin');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->foreign('facility_id')
                ->references('id')
                ->on('facilities')
                ->restrictOnDelete();

            $table->foreign('category_dict_id')
                ->references('id')
                ->on('positions')
                ->restrictOnDelete();

            $table->foreign('type_dict_id')
                ->references('id')
                ->on('positions')
                ->restrictOnDelete();

            $table->foreign('status_dict_id')
                ->references('id')
                ->on('positions')
                ->restrictOnDelete();

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->restrictOnDelete();
        });

        Schema::create('meeting_attendants', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('meeting_id', 36)->collation('ascii_bin');
            $table->char('user_id', 36)->collation('ascii_bin');
            $table->string('attendance_type', 36)->collation('ascii_bin');
            $table->char('attendance_status_dict_id', 36)->collation('ascii_bin')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['meeting_id', 'user_id']);

            $table->foreign('meeting_id')
                ->references('id')
                ->on('meetings')
                ->restrictOnDelete();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->restrictOnDelete();

            $table->foreign('attendance_status_dict_id')
                ->references('id')
                ->on('positions')
                ->restrictOnDelete();
        });

        Schema::create('meeting_resources', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('meeting_id', 36)->collation('ascii_bin');
            $table->char('resource_dict_id', 36)->collation('ascii_bin');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['meeting_id', 'resource_dict_id']);

            $table->foreign('meeting_id')
                ->references('id')
                ->on('meetings')
                ->restrictOnDelete();

            $table->foreign('resource_dict_id')
                ->references('id')
                ->on('positions')
                ->restrictOnDelete();
        });

        $timestamp = '2023-11-12 19:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';

        DB::table('dictionaries')->upsert([
            [
                'id' => $this->meetingStatusDictionaryId,
                'name' => 'meetingStatus',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => $this->meetingResourceDictionaryId,
                'name' => 'meetingResource',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => $this->attendanceStatusDictionaryId,
                'name' => 'attendanceStatus',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => $systemUserId,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ], 'id');

        DB::table('attributes')->upsert([
            [
                'id' => $this->meetingCategoryAttributeId,
                'facility_id' => null,
                'table' => 'meetings',
                'model' => 'meeting',
                'name' => 'category',
                'api_name' => 'category_dict_id',
                'type' => 'dict',
                'dictionary_id' => $this->meetingCategoryDictionaryId,
                'default_order' => 1,
                'is_multi_value' => null,
                'requirement_level' => 'required',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => $this->meetingTypeAttributeId,
                'facility_id' => null,
                'table' => 'meetings',
                'model' => 'meeting',
                'name' => 'type',
                'api_name' => 'type_dict_id',
                'type' => 'dict',
                'dictionary_id' => $this->meetingTypeDictionaryId,
                'default_order' => 1,
                'is_multi_value' => null,
                'requirement_level' => 'required',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => $this->meetingStatusAttributeId,
                'facility_id' => null,
                'table' => 'meetings',
                'model' => 'meeting',
                'name' => 'status',
                'api_name' => 'status_dict_id',
                'type' => 'dict',
                'dictionary_id' => $this->meetingStatusDictionaryId,
                'default_order' => 1,
                'is_multi_value' => null,
                'requirement_level' => 'required',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => $this->attendanceStatusAttributeId,
                'facility_id' => null,
                'table' => 'meeting_attendants',
                'model' => 'meeting_attendant',
                'name' => 'attendance_status',
                'api_name' => 'attendance_status_dict_id',
                'type' => 'dict',
                'dictionary_id' => $this->attendanceStatusDictionaryId,
                'default_order' => 1,
                'is_multi_value' => null,
                'requirement_level' => 'optional',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => $this->meetingResourceAttributeId,
                'facility_id' => null,
                'table' => 'meeting_resources',
                'model' => 'meeting_resource',
                'name' => 'resource',
                'api_name' => 'resource_dict_id',
                'type' => 'dict',
                'dictionary_id' => $this->meetingResourceDictionaryId,
                'default_order' => 1,
                'is_multi_value' => null,
                'requirement_level' => 'required',
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ], 'id');

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('positions')->where('dictionary_id', $this->attendanceStatusDictionaryId)->delete();
        DB::table('positions')->where('dictionary_id', $this->meetingStatusDictionaryId)->delete();
        DB::table('positions')->where('dictionary_id', $this->meetingResourceDictionaryId)->delete();

        DB::table('attributes')->delete($this->attendanceStatusAttributeId);
        DB::table('attributes')->delete($this->meetingCategoryAttributeId);
        DB::table('attributes')->delete($this->meetingTypeAttributeId);
        DB::table('attributes')->delete($this->meetingStatusAttributeId);
        DB::table('attributes')->delete($this->meetingResourceAttributeId);

        DB::table('dictionaries')->delete($this->attendanceStatusDictionaryId);
        DB::table('dictionaries')->delete($this->meetingStatusDictionaryId);
        DB::table('dictionaries')->delete($this->meetingResourceDictionaryId);

        Schema::dropIfExists('meeting_resources');
        Schema::dropIfExists('meeting_attendants');
        Schema::dropIfExists('meetings');
    }
};
