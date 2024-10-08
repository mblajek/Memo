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
        // documents links
        DB::table('attributes')->where('id', 'e1c14100-070d-4213-8927-6b7aed9617a4')
            ->update(['type' => 'text']);
    }

    public function down(): void
    {
    }
};
