<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Tests\TestCase;

class UserAuthenticationTest extends TestCase
{
    private const URL_STATUS = '/api/v1/user/status';
    private const URL_LOGIN = '/api/v1/user/login';
    private const URL_LOGOUT = '/api/v1/user/logout';
    private const URL_PASSWORD = '/api/v1/user/password';

    use DatabaseTransactions;

    public function testStatusWithUnauthorizedUserWillFail(): void
    {
        $result = $this->get(static::URL_STATUS);

        $this->assertEquals('exception.unauthorised', $result->json('errors')[0]['code']);
        $result->assertUnauthorized();
        $result->assertJsonStructure($this->unauthorizedErrorJsonStructure());
    }

    public function testStatusWithAuthorizedUserWillPass(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Auth::setUser($user);

        $result = $this->get(static::URL_STATUS);

        $this->assertEquals($user->id, $result->json('data.user.id'));
        $result->assertOk();
        $result->assertJsonStructure($this->loggedUserStatusJsonStructure());
    }

    public function testLoginWithInvalidDataWillFail(): void
    {
        $data = [
            'email' => 'test',
            'password' => [5],
        ];

        $result = $this->post(static::URL_LOGIN, $data);

        $this->assertEquals('exception.validation', $result->json('errors')[0]['code']);
        $result->assertBadRequest();
        $result->assertJsonStructure($this->invalidLoginErrorJsonStructure());
    }

    public function testLoginWithNonexistentDataWillFail(): void
    {
        $data = [
            'email' => 'test@test.pl',
            'password' => '12345',
        ];

        $result = $this->post(static::URL_LOGIN, $data);

        $this->assertEquals('exception.unauthorised', $result->json('errors')[0]['code']);
        $result->assertUnauthorized();
        $result->assertJsonStructure($this->unauthorizedErrorJsonStructure());
    }

    public function testLoginWithExistentDataWillPass(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'email' => $user->email,
            'password' => 'password',
        ];

        $result = $this->post(static::URL_LOGIN, $data);

        $this->assertEquals($user->id, Auth::user()->id);
        $result->assertOk();
    }

    public function testLogoutWillPass(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Auth::setUser($user);

        $result = $this->post(static::URL_LOGOUT);

        $this->assertEquals(null, Auth::user());
        $result->assertOk();
    }

    public function testChangePasswordWIthInvalidRepeatWillFail(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Auth::setUser($user);

        $data = [
            'current' => 'password',
            'password' => 'pBssword1',
            'repeat' => 'pBssword2',
        ];

        $result = $this->post(static::URL_PASSWORD, $data);

        $result->assertBadRequest();
    }

    public function testChangePasswordWithInvalidRegexWillFail(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Auth::setUser($user);

        $data = [
            'current' => 'password',
            'password' => 'password',
            'repeat' => 'password',
        ];

        $result = $this->post(static::URL_PASSWORD, $data);

        $result->assertBadRequest();
    }

    public function testChangePasswordWithInvalidCurrentWillFail(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Auth::setUser($user);

        $data = [
            'current' => 'password1',
            'password' => 'pBssword1',
            'repeat' => 'pBssword1'
        ];

        $result = $this->post(static::URL_PASSWORD, $data);

        $result->assertBadRequest();
    }

    public function testChangePasswordNotLoggedWillFail(): void
    {
        $data = [
            'current' => 'password',
            'password' => 'pBssword1',
            'repeat' => 'pBssword1',
        ];

        $result = $this->post(static::URL_PASSWORD, $data);

        $result->assertUnauthorized();
    }

    public function testChangePasswordWillPass(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        Auth::setUser($user);

        $data = [
            'current' => 'password',
            'password' => 'pBssword1',
            'repeat' => 'pBssword1',
        ];

        $result = $this->post(static::URL_PASSWORD, $data);

        $this->assertEquals($user->id, Auth::user()->id);
        $result->assertOk();
    }

    private function unauthorizedErrorJsonStructure(): array
    {
        return [
            'errors' => [
                [
                    'code',
                ],
            ],
        ];
    }

    private function invalidLoginErrorJsonStructure(): array
    {
        return [
            'errors' => [
                [
                    'code',
                    'validation' => [
                        [
                            'field',
                            'code',
                        ]
                    ],
                ],
            ],
        ];
    }

    private function loggedUserStatusJsonStructure(): array
    {
        return [
            'data' => [
                'user' => [
                    'id',
                    'name',
                    'email',
                    'lastLoginFacilityId',
                ],
                'permissions' => [
                    'unverified',
                    'verified',
                    'globalAdmin',
                ]
            ],
        ];
    }
}
