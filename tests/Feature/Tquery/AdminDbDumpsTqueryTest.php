<?php

namespace Tests\Feature\Tquery;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminDbDumpsTqueryTest extends TqueryTestCase
{
    private const string URL = '/api/v1/admin/db-dump/tquery';

    private string $dbDumpsFile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->dbDumpsFile = tempnam(sys_get_temp_dir(), 'db_dumps_test_');
        Config::set('database.connections.db_dumps.database', $this->dbDumpsFile);
        DB::purge('db_dumps');
        Schema::connection('db_dumps')->create('db_dumps', function (Blueprint $table) {
            $table->char('id', 36);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->char('created_by', 36);
            $table->char('updated_by', 36);
            $table->string('status', 36);
            $table->string('name')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('app_version');
            $table->dateTime('restored_rc_at')->nullable();
            $table->dateTime('restored_prod_at')->nullable();
            $table->boolean('is_from_rc');
            $table->boolean('is_backuped');
        });
    }

    protected function tearDown(): void
    {
        DB::statement('drop temporary table if exists `db_dumps_copy`');
        DB::purge('db_dumps');
        unlink($this->dbDumpsFile);
        parent::tearDown();
    }

    private function insertDbDump(string $name, string $userId): void
    {
        DB::connection('db_dumps')->table('db_dumps')->insert([
            'id' => Str::uuid()->toString(),
            'created_at' => '2026-01-01 10:00:00',
            'updated_at' => '2026-01-01 10:00:00',
            'created_by' => $userId,
            'updated_by' => $userId,
            'status' => 'created',
            'name' => $name,
            'file_size' => 100,
            'app_version' => 'test',
            'is_from_rc' => true,
            'is_backuped' => false,
        ]);
    }

    public function testListsDumpsCreatedByUsersUnknownLocally(): void
    {
        $this->insertDbDump('known', User::SYSTEM);
        $this->insertDbDump('unknown', Str::uuid()->toString());

        $response = $this->tpiPost(self::URL, [
            'columns' => self::columns('name', 'createdBy.name', 'updatedBy.name'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(50),
        ]);
        $systemName = User::query()->findOrFail(User::SYSTEM)->name;
        $this->assertSame(
            [
                ['name' => 'known', 'createdBy.name' => $systemName, 'updatedBy.name' => $systemName],
                ['name' => 'unknown', 'createdBy.name' => null, 'updatedBy.name' => null],
            ],
            $this->assertTqueryData($response, 2),
        );
        $this->assertSame(2, $response['meta']['totalDataSize']);
    }
}
