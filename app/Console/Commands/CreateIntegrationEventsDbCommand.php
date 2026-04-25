<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Console\Command;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

class CreateIntegrationEventsDbCommand extends Command
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
                DMH::charUuid($table, 'id')->unique()->collation('binary');
                $table->integerIncrements('seq');
                $table->dateTime('created_at');
                $table->dateTime('updated_at');
                DMH::charUuid($table, 'created_by')->collation('binary');
                DMH::charUuid($table, 'updated_by')->collation('binary');
                DMH::charUuid($table, 'facility_id')->collation('binary');
                DMH::ascii($table, 'type')->collation('binary');
                DMH::charUuid($table, 'object_id')->collation('binary');
            });

            $connection->statement(
                'create index "events_out_facility_id_index" on "events_out"("facility_id")',
            );
            $connection->statement(
                'create index "events_out_created_at_index" on "events_out"("created_at")',
            );
            $connection->statement(
                'create index "events_out_type_object_id_index" on "events_out"("type", "object_id")',
            );

            $connection->getSchemaBuilder()->create('listeners', function (Blueprint $table) {
                DMH::charUuid($table, 'id')->primary()->collation('binary');
                $table->dateTime('created_at');
                $table->dateTime('updated_at');
                DMH::ascii($table, 'listener_code', 50)->unique()->collation('binary');
                $table->unsignedInteger('last_processed_event_seq')->nullable();
            });
        }
    }
}
