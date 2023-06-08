<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class PostAdminUserTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/user';

    public function testWithValidDataReturnSuccess(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutPasswordReturnSuccess(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => null,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutEmailReturnSuccess(): void
    {
        $data = [
            'name' => 'Test',
            'email' => null,
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutGlobalAdminReturnSuccess(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutReferredFieldWillFail(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => null,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
    }

    public function testWithNullableReferredFieldReturnSuccess(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => 'pBssword1',
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }
}
