<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private string $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';

    public function up(): void
    {
        DB::table('attributes')->where('id', '8111626d-130c-454d-b0c0-9fda9ab9917a')->update(['default_order' => 2]);
        DB::table('attributes')->where('id', 'e443e2c2-82fc-41d3-8fda-fe374e5329d3')->update(['default_order' => 3]);
        Schema::table('attributes', function (Blueprint $table) {
            $table->unique(['table', 'api_name']);
            $table->unique(['table', 'default_order']);
        });
        $this->add('attributes', true);
        $this->add('clients', true);
        $this->add('dictionaries', false);
        $this->add('facilities', true);
        $this->add('grants', false);
        $this->add('meeting_attendants', true);
        $this->add('meeting_resources', true);
        $this->add('members', true);
        $this->add('positions', false);
        $this->add('staff_members', true);
        $this->add('timetables', true);
        $this->add('users', false);
        $this->add('values', false);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->drop('values', false);
        $this->drop('users', false);
        $this->drop('timetables', true);
        $this->drop('staff_members', true);
        $this->drop('positions', false,);
        $this->drop('members', true);
        $this->drop('meeting_resources', true);
        $this->drop('meeting_attendants', true);
        $this->drop('grants', false);
        $this->drop('facilities', true);
        $this->drop('dictionaries', false);
        $this->drop('clients', true);
        $this->drop('attributes', true);

        Schema::table('attributes', function (Blueprint $table) {
            $table->dropUnique(['table', 'default_order']);
            $table->dropUnique(['table', 'api_name']);
        });
    }

    private function add(string $table, bool $createdBy): void
    {
        if ($createdBy) {
            Schema::table($table, function (Blueprint $table) {
                $table->char('created_by', 36)->collation('ascii_bin')->nullable();
            });
            DB::table($table)->update(['created_by' => $this->systemUserId]);
            Schema::table($table, function (Blueprint $table) {
                $table->char('created_by', 36)->collation('ascii_bin')->change();
                $table->foreign('created_by')->references('id')->on('users');
            });
        }
        Schema::table($table, function (Blueprint $table) {
            $table->char('updated_by', 36)->collation('ascii_bin')->nullable();
        });
        DB::statement("update `$table` set `updated_by` = `created_by` where `updated_by` is null");
        Schema::table($table, function (Blueprint $table) {
            $table->char('updated_by', 36)->collation('ascii_bin')->change();
            $table->foreign('updated_by')->references('id')->on('users');
        });
    }

    private function drop(string $table, bool $createdBy): void
    {
        if ($createdBy) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            });
        }
        Schema::table($table, function (Blueprint $table) {
            $table->dropForeign(['updated_by']);
            $table->dropColumn('updated_by');
        });
    }
};
