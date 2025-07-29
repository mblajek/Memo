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
        $connection = DB::connection('db_dumps');
        $databaseFile = $connection->getConfig('database');

        if (!file_exists($databaseFile)) {
            file_put_contents($databaseFile, '');
            chmod($databaseFile, 0600);

            Schema::setConnection($connection)->create('db_dumps', function (Blueprint $table) {
                DMH::charUuid($table, 'id')->collation('binary');
                $table->dateTime('created_at');
                $table->dateTime('updated_at');
                DMH::charUuid($table, 'created_by')->collation('binary');
                DMH::charUuid($table, 'updated_by')->collation('binary');
                DMH::ascii($table, 'status')->collation('binary');
                $table->string('name')->nullable();
                $table->integer('file_size')->nullable();
                $table->string('app_version');
                $table->dateTime('restored_rc_at')->nullable();
                $table->dateTime('restored_prod_at')->nullable();
                $table->boolean('is_from_rc');
                $table->boolean('is_backuped');
            });
            // neither $table->dateTime('created_at')->index() / $table->index('created_at') worked
            $connection->statement('create index "db_dumps_created_at_index" on "db_dumps"("created_at")');
        }
    }

    public function down(): void
    {
        $connection = DB::connection('db_dumps');
        $databaseFile = $connection->getConfig('database');

        unlink($databaseFile);
    }
};
