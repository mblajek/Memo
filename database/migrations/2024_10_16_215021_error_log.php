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
        Schema::create('texts', function (Blueprint $table) {
            DMH::charUuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->integer('length');
            $table->string('short_text', 16351);
            $table->mediumText('long_text')->nullable();
        });

        Schema::create('log_entries', function (Blueprint $table) {
            DMH::charUuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            DMH::ascii($table, 'app_version');

            DMH::charUuid($table, 'user_id')->nullable();
            DMH::ascii($table, 'source');
            DMH::ascii($table, 'client_ip', 255)->nullable();
            DMH::charUuid($table, 'user_agent_text_id')->nullable();

            DMH::ascii($table, 'error_level');
            $table->string('message', 4096);
            DMH::charUuid($table, 'context_text_id')->nullable();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('user_agent_text_id')->references('id')->on('texts');
        });

        Schema::create('notifications', function (Blueprint $table) {
            DMH::base($table);
            DMH::charUuid($table, 'facility_id')->nullable();
            DMH::charUuid($table, 'user_id')->nullable();
            DMH::charUuid($table, 'client_id')->nullable();
            DMH::charUuid($table, 'meeting_id')->nullable();

            DMH::charUuid($table, 'notification_method_dict_id');
            $table->string('address')->nullable();
            $table->string('subject', 4096);
            $table->string('message', 4096)->nullable();
            $table->string('message_html', 4096)->nullable();

            $table->dateTime('scheduled_at');
            DMH::ascii($table, 'service')->nullable();
            DMH::ascii($table, 'status');
            DMH::charUuid($table, 'error_log_entry_id')->nullable();

            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('client_id')->references('id')->on('clients');
            $table->foreign('meeting_id')->references('id')->on('meetings');
            $table->foreign('notification_method_dict_id')->references('id')->on('positions');
            $table->foreign('error_log_entry_id')->references('id')->on('log_entries');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('log_entries');
        Schema::dropIfExists('texts');
    }
};
