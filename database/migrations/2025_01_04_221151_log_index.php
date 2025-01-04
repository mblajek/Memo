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
        Schema::table('log_entries', function (Blueprint $table) {
            $table->index(['created_at']);
            $table->index(['source']);
            $table->index(['log_level']);
        });
    }

    public function down(): void
    {
        Schema::table('log_entries', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['source']);
            $table->dropIndex(['log_level']);
        });
    }
};
