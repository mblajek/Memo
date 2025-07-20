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
        Schema::table('facilities', function (Blueprint $table) {
            $table->string('contact_phone')->nullable();
            $table->string('meeting_notification_template_subject')->nullable();
            $table->string('meeting_notification_template_message', 4096)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn('contact_phone');
            $table->dropColumn('meeting_notification_template_subject');
            $table->dropColumn('meeting_notification_template_message');
        });
    }
};
