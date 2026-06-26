<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Facility;
use App\Models\Grant;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Facility-scoped authorization on a facilityAdmin|facilityStaff endpoint (GET client
 * list). Unlike AdminAuthorizationTest (which injects PermissionObjects), these use real
 * authentication so the middleware's per-facility membership computation
 * (requestPermissions) is exercised -- in particular that membership in one facility does
 * not grant access to another.
 *
 * Fixtures are created under the admin context (setUp); each test then authenticates as
 * the user under test and lets the middleware derive permissions (setPermissions(null)).
 */
class FacilityAuthorizationTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create();
    }

    private function listClientsAs(User $user): TestResponse
    {
        $this->actingAs($user);
        $this->withSession([PermissionMiddleware::SESSION_PASSWORD_HASH_HASH => $user->passwordHashHash()]);
        PermissionMiddleware::setPermissions(null); // derive permissions from the authenticated request
        // `in` is required by the list endpoint; supplying it keeps a *successful* request at 200.
        return $this->getJson(sprintf('/api/v1/facility/%s/user/client/list?in=%s', $this->facility->id, $user->id));
    }

    public function testVerifiedNonMemberIsForbidden(): void
    {
        $outsider = User::factory()->create(); // verified, but not a member of the facility
        $result = $this->listClientsAs($outsider);
        $result->assertForbidden();
        self::assertEquals('exception.forbidden', $result->json('errors')[0]['code']);
    }

    public function testMemberOfAnotherFacilityIsForbidden(): void
    {
        $otherFacility = Facility::factory()->create();
        $user = User::factory()->create();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $otherFacility->id,
            'facility_admin_grant_id' => Grant::factory()->create()->id,
        ]);
        // Admin of $otherFacility, but requesting $this->facility -> no membership there.
        $result = $this->listClientsAs($user);
        $result->assertForbidden();
        self::assertEquals('exception.forbidden', $result->json('errors')[0]['code']);
    }

    public function testFacilityAdminMemberIsAllowed(): void
    {
        $user = User::factory()->create();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'facility_admin_grant_id' => Grant::factory()->create()->id,
        ]);
        $this->listClientsAs($user)->assertOk();
    }
}
