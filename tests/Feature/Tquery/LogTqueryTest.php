<?php

namespace Tests\Feature\Tquery;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\LogEntry;
use App\Models\User;
use Illuminate\Support\Str;

class LogTqueryTest extends TqueryTestCase
{
    private const string URL = '/api/v1/admin/developer/log/tquery';

    protected function setUp(): void
    {
        parent::setUp();
        $creator = new PermissionObjectCreator();
        $creator->user = User::query()->findOrFail(User::SYSTEM);
        $creator->loggedIn = true;
        $creator->verified = true;
        $creator->globalAdmin = true;
        $creator->developer = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());
    }

    private function createLogEntry(string $message, ?string $clientIp): LogEntry
    {
        $logEntry = new LogEntry([
            'app_version' => 'test',
            'source' => 'api_custom_script',
            'client_ip' => $clientIp,
            'log_level' => 'info',
            'message' => $message,
        ]);
        $logEntry->saveOrFail();
        return $logEntry;
    }

    public function testClientIpIsNullable(): void
    {
        $columns = array_column($this->tpiGet(self::URL)['columns'], null, 'name');
        $this->assertTrue($columns['clientIp']['nullable']);

        $prefix = 'LTQ ' . Str::random(10);
        $this->createLogEntry("$prefix with IP", '127.0.0.1');
        $withoutIp = $this->createLogEntry("$prefix without IP", null);
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'clientIp'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('message', 'v%', $prefix),
                self::filterColumn('clientIp', 'null'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals($withoutIp->id, $data[0]['id']);
        $this->assertNull($data[0]['clientIp']);
    }
}
