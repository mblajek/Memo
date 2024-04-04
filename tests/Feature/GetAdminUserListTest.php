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
        $startCount = count($this->get(static::URL)->json('data'));

        User::factory()->count(5)->create();

        $result = $this->get(static::URL);

        $result->assertOk();
        $result->assertJsonStructure($this->jsonStructure());
        $this->assertCount(5 + $startCount, $result->json('data'));
    }

    public function testWithEmptyDataReturnSuccess(): void
    {
        $result = $this->get(static::URL);

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
