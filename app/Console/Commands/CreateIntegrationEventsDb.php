<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Console\Command;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

class CreateIntegrationEventsDb extends Command
{
    protected $signature = 'fz:create-integration-events-db';
    protected $description = 'Create sqlite database for integration events';

    public function handle(): void
    {
        $connection = DB::connection('integration_events');
        $databaseFile = $connection->getConfig('database');

        if (!file_exists($databaseFile)) {
            file_put_contents($databaseFile, '');
            chmod($databaseFile, 0600);

            $connection->getSchemaBuilder()->create('events_out', function (Blueprint $table) {
                DMH::charUuid($table, 'id')->collation('binary');
                $table->dateTime('created_at');
                $table->dateTime('updated_at');
                DMH::charUuid($table, 'created_by')->collation('binary');
                DMH::charUuid($table, 'updated_by')->collation('binary');
                DMH::charUuid($table, 'facility_id')->collation('binary');
                DMH::ascii($table, 'type')->collation('binary');
                DMH::charUuid($table, 'object_id')->collation('binary');
                DMH::ascii($table, 'status')->collation('binary');
            });

            $connection->statement(
                'create index "events_out_facility_id_index" on "events_out"("facility_id")',
            );
            $connection->statement(
                'create index "events_out_type_object_id_index" on "events_out"("type", "object_id")',
            );
        }
    }
}
