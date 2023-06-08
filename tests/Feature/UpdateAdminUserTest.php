<?php

namespace Tests\Feature;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class UpdateAdminUserTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/user/%s';

    public function testWithValidDataReturnSuccess(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->patch(sprintf(static::URL, $user->id), $data);

        $user->refresh();

        $result->assertOk();
        $this->assertEquals($data['name'], $user->name);
        $this->assertEquals($data['email'], $user->email);
    }

    public function testWithSpecificFieldReturnSuccess(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'name' => 'Test',
        ];

        $result = $this->patch(sprintf(static::URL, $user->id), $data);

        $user->refresh();

        $result->assertOk();
        $this->assertEquals($data['name'], $user->name);
    }

    public function testWithRemovedGrantReturnSuccess(): void
    {
        /** @var Grant $grant */
        $grant = Grant::factory()->create();
        /** @var User $user */
        $user = User::factory()->create(['global_admin_grant_id' => $grant->id]);

        $data = [
            'hasGlobalAdmin' => false,
        ];

        $result = $this->patch(sprintf(static::URL, $user->id), $data);

        $user->refresh();

        $result->assertOk();
        $this->assertNull($user->global_admin_grant_id);
        $this->assertNull(Grant::query()->where('id', $grant->id)->first());
    }
}
