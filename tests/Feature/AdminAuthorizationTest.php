<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Authorization enforcement on a globalAdmin-only endpoint (admin user PATCH). The
 * existing admin CRUD tests only cover the happy path (they always run as globalAdmin);
 * these assert the middleware actually rejects unauthenticated and under-privileged
 * callers.
 *
 * Permissions are injected via PermissionMiddleware::setPermissions() -- the same hook
 * the test helpers use. Note: BaseModel stamps created_by/updated_by from the current
 * permission user on every save, so all fixtures are created under the admin context
 * (prepareAdminUser in setUp); each test only switches the permission object right
 * before issuing the request, which does no model writes on the reject path.
 */
class AdminAuthorizationTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private string $targetId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();                       // valid context for fixture creation
        $this->targetId = User::factory()->create()->id;
    }

    private function patchTarget(): TestResponse
    {
        return $this->patch(sprintf('/api/v1/admin/user/%s', $this->targetId), []);
    }

    public function testUnauthenticatedUserGets401(): void
    {
        PermissionMiddleware::setPermissions(null);      // request derives an unauthorised object
        $result = $this->patchTarget();
        $result->assertUnauthorized();
        self::assertEquals('exception.unauthorised', $result->json('errors')[0]['code']);
    }

    public function testVerifiedNonAdminGets403(): void
    {
        $creator = new PermissionObjectCreator();
        $creator->user = User::factory()->create();      // created under the admin context from setUp
        $creator->loggedIn = true;
        $creator->verified = true;                       // verified, but no globalAdmin
        PermissionMiddleware::setPermissions($creator->getPermissionObject());

        $result = $this->patchTarget();
        $result->assertForbidden();
        self::assertEquals('exception.forbidden', $result->json('errors')[0]['code']);
    }

    public function testGlobalAdminIsAllowed(): void
    {
        // Sanity: the same request as global admin passes authorization (empty patch is valid),
        // so the 401/403 above are real authorization failures, not the endpoint always erroring.
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());
        $this->patchTarget()->assertOk();
    }
}
