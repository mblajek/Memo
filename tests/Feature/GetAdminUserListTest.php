<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class GetAdminUserListTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/user/list';

    public function testWithValidDataReturnSuccess(): void
    {
        $users = User::factory()->count(5)->create();
        $in = $users->pluck('id')->implode(',');

        $result = $this->get(static::URL . '?in=' . $in);

        $result->assertOk();
        $result->assertJsonStructure($this->jsonStructure());
        $this->assertCount(5, $result->json('data'));
    }

    public function testWithEmptyDataReturnSuccess(): void
    {
        $result = $this->get(static::URL . '?in=00000000-0000-0000-0000-000000000000');

        $result->assertOk();
    }

    private function jsonStructure(): array
    {
        return [
            'data' => [
                [
                    'id',
                    'name',
                    'email',
                    'lastLoginFacilityId',
                    'passwordExpireAt',
                    'hasPassword',
                    'createdAt',
                    'updatedAt',
                    'hasEmailVerified',
                    'createdBy',
                    'updatedBy',
                    'hasGlobalAdmin',
                    'members',
                ],
            ],
        ];
    }
}
