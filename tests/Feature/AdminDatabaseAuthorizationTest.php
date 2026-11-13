<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * The DB dump endpoints where the server keeps no dumps: the caller's permissions are checked
 * first, so only the global admin is told that dumps are disabled.
 */
class AdminDatabaseAuthorizationTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const string URL = '/api/v1/admin/db-dump/tquery';

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('database.connections.db_dumps.database', null);
    }

    private function assertError(TestResponse $result, int $status, string $code): void
    {
        $result->assertStatus($status);
        self::assertEquals($code, $result->json('errors')[0]['code']);
    }

    public function testUnauthenticatedUserGets401(): void
    {
        PermissionMiddleware::setPermissions(null);
        $this->assertError($this->get(self::URL), 401, 'exception.unauthorised');
    }

    public function testVerifiedNonAdminGets403(): void
    {
        $this->prepareAdminUser();
        $creator = new PermissionObjectCreator();
        $creator->user = User::factory()->create();
        $creator->loggedIn = true;
        $creator->verified = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());

        $this->assertError($this->get(self::URL), 403, 'exception.forbidden');
    }

    public function testGlobalAdminGets409(): void
    {
        $this->prepareAdminUser();
        $this->assertError($this->get(self::URL), 409, 'exception.db.db_dumps_disabled');
    }

    public function testGlobalAdminIsAllowedWhereDumpsAreEnabled(): void
    {
        $dbDumpsFile = tempnam(sys_get_temp_dir(), 'db_dumps_test_');
        try {
            Config::set('database.connections.db_dumps.database', $dbDumpsFile);
            $this->prepareAdminUser();
            $this->get(self::URL)->assertOk();
        } finally {
            unlink($dbDumpsFile);
        }
    }
}
