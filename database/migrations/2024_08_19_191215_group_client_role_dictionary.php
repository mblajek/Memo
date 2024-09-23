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
        $date = '2024-08-19 00:00:00';

        DB::table('dictionaries')->upsert([
            [
                'id' => 'f5d88a3b-6f3d-4b4a-8fed-208e1ee980d1',
                'name' => 'clientGroupClientRole',
                'is_fixed' => true,
                'is_extendable' => true,
                'created_by' => DMH::USER_SYSTEM,
                'updated_by' => DMH::USER_SYSTEM,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ], 'id');
    }

    public function down(): void
    {
        //
    }
};
