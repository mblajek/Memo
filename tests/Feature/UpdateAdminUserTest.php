<?php

namespace Tests\Feature;

use App\Models\Grant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
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

    private function execute(string $userId, array $data = []): TestResponse
    {
        return parent::patch(sprintf(static::URL, $userId), $data);
    }

    public function testWithValidDataReturnSuccess(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => self::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->execute($user->id, $data);
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

        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
        $this->assertEquals($data['name'], $user->name);
    }

    public function testWithRemovedGrantReturnSuccess(): void
    {
        /** @var Grant $grant */
        $grant = Grant::factory()->create();
        /** @var User $user */
        $user = User::factory()->create([
            'password_expire_at' => self::now(),
            'global_admin_grant_id' => $grant->id,
        ]);

        $data = [
            'hasGlobalAdmin' => false,
        ];

        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
        $this->assertNull($user->global_admin_grant_id);
        $this->assertNull(Grant::query()->where('id', $grant->id)->first());
    }

    // Request validation tests
    public function testWithEmptyDataSucceeds(): void
    {
        $user = User::factory()->create();

        $data = [];

        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
    }

    public function testWithNameSucceeds(): void
    {
        $user = User::factory()->create();

        $data = [
            'name' => 'Whatever',
        ];

        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
        $this->assertEquals($data['name'], $user->name);
    }

    public function testWithInvalidEmailFails(): void
    {
        $user = User::factory()->create();

        $data = [
            'email' => 'not.an.email.com',
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                'errors' => [
                    [
                        'code' => 'exception.validation',
                    ],
                    [
                        'field' => 'email',
                        'code' => 'validation.email',
                    ],
                ],
            ]
        );
    }


    public function testWithEmailAndEmailVerifiedSucceeds(): void
    {
        $user = User::factory()->create();

        $data = [
            'email' => 'new@email.com',
            'hasEmailVerified' => true,
        ];

        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
        $this->assertEquals($data['email'], $user->email);
        $this->assertNotNull($user->email_verified_at);
    }

    public function testWithEmailWithoutEmailVerifiedFails(): void
    {
        $user = User::factory()->create();

        $data = [
            'email' => 'new@email.com',
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                'errors' => [
                    [
                        'code' => 'exception.validation',
                    ],
                    [
                        'field' => 'hasEmailVerified',
                        'code' => 'validation.required_with',
                        'data' => [
                            'values' => [
                                'email',
                            ],
                        ],
                    ],
                ],
            ]
        );
    }

    public function testWithoutEmailWithEmailVerifiedFails(): void
    {
        $user = User::factory()->create(['email' => null, 'password' => null]);

        $data = [
            'hasEmailVerified' => true,
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                'errors' => [
                    [
                        'code' => 'exception.validation',
                    ],
                    [
                        'field' => 'email',
                        'code' => 'validation.required_if_accepted',
                        'data' => [
                            'other' => 'hasEmailVerified',
                        ],
                    ],
                ],
            ]
        );
    }

    public function testWithPasswordWithPasswordExpireAtSucceeds(): void
    {
        $user = User::factory()->create();

        $data = [
            'email' => 'test@test.com',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => self::now(),
        ];

        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
        $this->assertTrue(Hash::check('pBssword1', $user->password));
        $this->assertEquals($data['passwordExpireAt'], $user->password_expire_at->toIso8601ZuluString());
    }

    public function testWithPasswordWithoutPasswordExpireAtFails(): void
    {
        $user = User::factory()->create();

        $data = [
            'passwordExpireAt' => self::now(),
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    public function testWithoutPasswordWithPasswordExpireAtSucceeds(): void
    {
        $user = User::factory()->create();

        $data = [
            'passwordExpireAt' => self::now(),
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    // Logic tests
    public function testRemovingNameFails(): void
    {
        $user = User::factory()->create();

        $data = [
            'name' => null,
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    public function testWithoutPreexistingEmailWithPasswordFails(): void
    {
        $user = User::factory()->noEmail()->create();

        $data = [
            'password' => 'pBssword1',
            'passwordExpireAt' => self::now(),
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    public function testWithPasswordRemovingEmailFails(): void
    {
        $user = User::factory()->create();

        $data = [
            'email' => null,
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    public function testWithGlobalAdminRemovingEmailFails(): void
    {
        $user = User::factory()->globalAdmin()->create();

        $data = [
            'email' => null,
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    public function testWithGlobalAdminRemovingPasswordFails(): void
    {
        $user = User::factory()->globalAdmin()->create();

        $data = [
            'password' => null,
        ];

        $result = $this->execute($user->id, $data);

        $result->assertBadRequest();
    }

    public function testUpdatedAtGetsUpdated(): void
    {
        $this->travelTo(CarbonImmutable::create(2023, 10, 30));

        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => self::now(),
            'hasGlobalAdmin' => true,
        ];

        $this->travel(1)->day();
        $result = $this->execute($user->id, $data);
        $user->refresh();

        $result->assertOk();
        $this->assertEquals(CarbonImmutable::create(2023, 10, 31), $user->updated_at);

        $this->travelBack();
    }
}
