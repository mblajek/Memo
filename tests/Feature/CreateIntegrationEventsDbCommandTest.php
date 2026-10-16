<?php

namespace Tests\Feature;

use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CreateIntegrationEventsDbCommandTest extends TestCase
{
    private string $dir;
    private string $file;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir() . '/integration_events_test_' . bin2hex(random_bytes(4));
        $this->file = "$this->dir/integration_events.db";
        Config::set('database.connections.integration_events.database', $this->file);
        DB::purge('integration_events');
    }

    protected function tearDown(): void
    {
        DB::purge('integration_events');
        if (file_exists($this->file)) {
            unlink($this->file);
        }
        if (is_dir($this->dir)) {
            rmdir($this->dir);
        }
        parent::tearDown();
    }

    private function db(): Connection
    {
        return DB::connection('integration_events');
    }

    private function assertTablesExist(): void
    {
        $schema = $this->db()->getSchemaBuilder();
        $this->assertTrue($schema->hasTable('events_out'));
        $this->assertTrue($schema->hasTable('listeners'));
        $this->assertTrue($schema->hasIndex('events_out', 'events_out_type_object_id_index'));
    }

    private function insertListener(string $code): void
    {
        $this->db()->table('listeners')->insert([
            'id' => '00000000-0000-0000-0000-000000000001',
            'created_at' => '2026-01-01 10:00:00',
            'updated_at' => '2026-01-01 10:00:00',
            'listener_code' => $code,
            'last_processed_event_seq' => 7,
        ]);
    }

    public function testCreatesDatabase(): void
    {
        $this->artisan('fz:create-integration-events-db')->assertExitCode(0);

        $this->assertTablesExist();
    }

    public function testCreatesTablesInEmptyExistingFile(): void
    {
        mkdir($this->dir);
        touch($this->file);

        $this->artisan('fz:create-integration-events-db')
            ->expectsOutputToContain('created')
            ->assertExitCode(0);

        $this->assertTablesExist();
    }

    public function testCreatesMissingTableKeepingExistingOne(): void
    {
        mkdir($this->dir);
        touch($this->file);
        $this->db()->statement('create table "listeners" ("id" varchar not null, "created_at" datetime not null, '
            . '"updated_at" datetime not null, "listener_code" varchar not null, '
            . '"last_processed_event_seq" integer)');
        $this->insertListener('kept');

        $this->artisan('fz:create-integration-events-db')->assertExitCode(0);

        $this->assertTablesExist();
        $this->assertSame(['kept'], $this->db()->table('listeners')->pluck('listener_code')->all());
    }

    public function testKeepsExistingDatabase(): void
    {
        $this->artisan('fz:create-integration-events-db')->assertExitCode(0);
        $this->insertListener('kept');

        $this->artisan('fz:create-integration-events-db')
            ->expectsOutputToContain('already exists')
            ->assertExitCode(0);

        $this->assertSame(['kept'], $this->db()->table('listeners')->pluck('listener_code')->all());
    }

    public function testFailedCreationLeavesNoPartialTable(): void
    {
        mkdir($this->dir);
        touch($this->file);
        $this->db()->statement('create table "other" ("created_at" datetime)');
        $this->db()->statement('create index "events_out_created_at_index" on "other"("created_at")');

        try {
            $this->artisan('fz:create-integration-events-db')->run();
            $this->fail('The command should fail on the index name conflict.');
        } catch (QueryException) {
        }

        $this->assertFalse($this->db()->getSchemaBuilder()->hasTable('events_out'));
    }
}
