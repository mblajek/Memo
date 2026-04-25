<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attributes', function (Blueprint $table) {
            $table->mediumText('metadata')->nullable()->after('description');
        });
        DB::table('attributes')
            ->where('id', 'e1c14100-070d-4213-8927-6b7aed9617a4')
            ->update(['metadata' => json_encode(['is_multi_line' => false])]);
    }

    public function down(): void
    {
        Schema::table('attributes', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};
