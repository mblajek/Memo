<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private string $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';

    public function up(): void
    {
        //unique default_order on attributes
        DB::table('attributes')->where('id', '8111626d-130c-454d-b0c0-9fda9ab9917a')->update(['default_order' => 2]);
        DB::table('attributes')->where('id', 'e443e2c2-82fc-41d3-8fda-fe374e5329d3')->update(['default_order' => 3]);
        Schema::table('attributes', function (Blueprint $table) {
            $table->unique(['table', 'api_name']);
            $table->unique(['table', 'default_order']);
        });
        // missing created_by and updated_by
        $this->addCratedUpdatedBy('attributes', true);
        $this->addCratedUpdatedBy('clients', true);
        $this->addCratedUpdatedBy('dictionaries', false);
        $this->addCratedUpdatedBy('facilities', true);
        $this->addCratedUpdatedBy('grants', false);
        $this->addCratedUpdatedBy('meeting_attendants', true);
        $this->addCratedUpdatedBy('meeting_resources', true);
        $this->addCratedUpdatedBy('members', true);
        $this->addCratedUpdatedBy('positions', false);
        $this->addCratedUpdatedBy('staff_members', true);
        $this->addCratedUpdatedBy('timetables', true);
        $this->addCratedUpdatedBy('users', false);
        $this->addCratedUpdatedBy('values', false);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->dropCreatedUpdatedBy('values', false);
        $this->dropCreatedUpdatedBy('users', false);
        $this->dropCreatedUpdatedBy('timetables', true);
        $this->dropCreatedUpdatedBy('staff_members', true);
        $this->dropCreatedUpdatedBy('positions', false,);
        $this->dropCreatedUpdatedBy('members', true);
        $this->dropCreatedUpdatedBy('meeting_resources', true);
        $this->dropCreatedUpdatedBy('meeting_attendants', true);
        $this->dropCreatedUpdatedBy('grants', false);
        $this->dropCreatedUpdatedBy('facilities', true);
        $this->dropCreatedUpdatedBy('dictionaries', false);
        $this->dropCreatedUpdatedBy('clients', true);
        $this->dropCreatedUpdatedBy('attributes', true);

        Schema::table('attributes', function (Blueprint $table) {
            $table->dropUnique(['table', 'default_order']);
            $table->dropUnique(['table', 'api_name']);
        });
    }

    private function addCratedUpdatedBy(string $table, bool $createdBy): void
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

    private function dropCreatedUpdatedBy(string $table, bool $createdBy): void
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
