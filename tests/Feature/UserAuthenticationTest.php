<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use PragmaRX\Google2FA\Google2FA;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class UserAuthenticationTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const URL_STATUS = '/api/v1/user/status';
    private const URL_LOGIN = '/api/v1/user/login';
    private const URL_LOGOUT = '/api/v1/user/logout';
    private const URL_PASSWORD = '/api/v1/user/password';

    // The factory password hash corresponds to this plaintext (see UserFactory).
    private const CORRECT_PASSWORD = 'password';

    /**
     * Authenticate the next request as $user. PermissionMiddleware requires both an authenticated
     * user and a matching password-hash marker in the session (see checkSessionPasswordHashHash),
     * so setting the guard user alone is not enough.
     */
    private function actingAsUser(User $user): void
    {
        $this->actingAs($user);
        $this->withSession([
            PermissionMiddleware::SESSION_PASSWORD_HASH_HASH => $user->passwordHashHash(),
        ]);
    }

    /**
     * Model save hooks read PermissionMiddleware (to attach integration events), so permissions
     * must be initialised while the user is created. They are cleared afterwards so each request
     * resolves its own permissions from the session.
     */
    private function createUser(array $attributes = []): User
    {
        $this->prepareAdminUser();
        $user = User::factory()->create($attributes);
        PermissionMiddleware::setPermissions(null);
        return $user;
    }

    public function testStatusWithUnauthorizedUserWillFail(): void
    {
        $result = $this->get(static::URL_STATUS);

        $this->assertEquals('exception.unauthorised', $result->json('errors')[0]['code']);
        $result->assertUnauthorized();
        $result->assertJsonStructure($this->unauthorizedErrorJsonStructure());
    }

    public function testStatusWithAuthorizedUserWillPass(): void
    {
        $user = $this->createUser();
        $this->actingAsUser($user);

        $result = $this->get(static::URL_STATUS);

        $result->assertOk();
        $this->assertEquals($user->id, $result->json('data.user.id'));
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

        $this->assertEquals('exception.bad_credentials', $result->json('errors')[0]['code']);
        $result->assertUnauthorized();
        $result->assertJsonStructure($this->unauthorizedErrorJsonStructure());
    }

    public function testLoginWithExistentDataWillPass(): void
    {
        // A past password_expire_at would be treated as a wrong password, so keep it unset.
        $user = $this->createUser(['password_expire_at' => null]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
        ]);

        $result->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function testLoginWithExpiredPasswordWillFail(): void
    {
        // An expired password is treated as a wrong password.
        $user = $this->createUser(['password_expire_at' => now()->subDay()]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
        ]);

        $result->assertUnauthorized();
        $this->assertEquals('exception.bad_credentials', $result->json('errors')[0]['code']);
        $this->assertGuest();
    }

    public function testLoginWithOtpWillPass(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = $this->createUser(['password_expire_at' => null, 'otp_secret' => $secret]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
            'otp' => $google2fa->getCurrentOtp($secret),
        ]);

        $result->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function testLoginWithInvalidOtpWillFail(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = $this->createUser(['password_expire_at' => null, 'otp_secret' => $secret]);

        $correctOtp = $google2fa->getCurrentOtp($secret);
        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
            'otp' => $correctOtp === '123456' ? '654321' : '123456',
        ]);

        $result->assertUnauthorized();
        $this->assertEquals('exception.bad_credentials', $result->json('errors')[0]['code']);
        $this->assertGuest();
    }

    public function testLoginWithReusedOtpWillFail(): void
    {
        // Replay protection: a successful login records its window in otp_used_ts, and
        // verifyKeyNewer only accepts a window strictly newer than that (makeStartingTimestamp
        // uses oldTimestamp + 1). So reusing the same code is rejected, even in the same window.
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = $this->createUser(['password_expire_at' => null, 'otp_secret' => $secret]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
            'otp' => $otp,
        ])->assertOk();

        // Reset the cached permission object so the second login resolves its own, as every request
        // does in production (fresh process). Otherwise the stale object from login 1 has a null user
        // and Auth::logout's user-stamp on the failed attempt would error with exception.unauthorised.
        PermissionMiddleware::setPermissions(null);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
            'otp' => $otp,
        ]);

        $result->assertUnauthorized();
        $this->assertEquals('exception.bad_credentials', $result->json('errors')[0]['code']);
        $this->assertGuest();
    }

    public function testConfigureOtpWithValidCodeEnablesOtp(): void
    {
        // otpGenerate stashes a secret candidate in the session; otpConfigure activates it once the
        // user proves possession. We seed the candidate directly (mirrors AuthController's private
        // SESSION_OTP_SECRET_CANDIDATE) so the test doesn't depend on cross-request session carry.
        $user = $this->createUser();
        $secret = (new Google2FA())->generateSecretKey();
        $this->actingAs($user);
        $this->withSession([
            PermissionMiddleware::SESSION_PASSWORD_HASH_HASH => $user->passwordHashHash(),
            'otp_secret_candidate' => ['otp_secret' => $secret, 'valid_until' => new \DateTimeImmutable('+1 minute')],
        ]);

        $result = $this->post('/api/v1/user/otp/configure', ['otp' => (new Google2FA())->getCurrentOtp($secret)]);

        $result->assertOk();
        $user->refresh();
        self::assertSame($secret, $user->otp_secret);
        self::assertNotNull($user->otp_used_ts);
    }

    public function testConfigureOtpWithWrongCodeFails(): void
    {
        $user = $this->createUser();
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $this->actingAs($user);
        $this->withSession([
            PermissionMiddleware::SESSION_PASSWORD_HASH_HASH => $user->passwordHashHash(),
            'otp_secret_candidate' => ['otp_secret' => $secret, 'valid_until' => new \DateTimeImmutable('+1 minute')],
        ]);

        // A 6-digit code that is not the candidate's current one.
        $wrong = $google2fa->getCurrentOtp($secret) === '123456' ? '654321' : '123456';
        $result = $this->post('/api/v1/user/otp/configure', ['otp' => $wrong]);

        $result->assertUnauthorized();
        $this->assertEquals('exception.bad_credentials', $result->json('errors')[0]['code']);
        $user->refresh();
        self::assertNull($user->otp_secret);
    }

    public function testLoginWithMissingOtpWhenRequiredWillFail(): void
    {
        // OTP is configured but the `otp` key is entirely absent: the `present` rule reports it.
        $secret = (new Google2FA())->generateSecretKey();
        $user = $this->createUser(['password_expire_at' => null, 'otp_secret' => $secret]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
        ]);

        $result->assertBadRequest();
        $this->assertEquals('exception.validation', $result->json('errors')[0]['code']);
        $otpErrorCodes = array_column(
            array_filter($result->json('errors'), fn(array $error) => ($error['field'] ?? null) === 'otp'),
            'code',
        );
        $this->assertContains('validation.present', $otpErrorCodes);
        $this->assertGuest();
    }

    public function testLoginWithEmptyOtpWhenRequiredWillFail(): void
    {
        // This is what the login form actually submits when no code is typed (otp defaults to "").
        // ConvertEmptyStringsToNull turns "" into null, so the response reports `otp` as required —
        // the code the form looks for to know it must prompt for OTP.
        $secret = (new Google2FA())->generateSecretKey();
        $user = $this->createUser(['password_expire_at' => null, 'otp_secret' => $secret]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
            'otp' => '',
        ]);

        $result->assertBadRequest();
        $this->assertEquals('exception.validation', $result->json('errors')[0]['code']);
        $otpErrorCodes = array_column(
            array_filter($result->json('errors'), fn(array $error) => ($error['field'] ?? null) === 'otp'),
            'code',
        );
        $this->assertContains('validation.required', $otpErrorCodes);
        $this->assertGuest();
    }

    public function testLoginWithOtpWhenNotConfiguredWillFail(): void
    {
        // Supplying an OTP for an account without OTP configured is rejected by validation.
        $user = $this->createUser(['password_expire_at' => null]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
            'otp' => '123456',
        ]);

        $result->assertBadRequest();
        $this->assertEquals('exception.validation', $result->json('errors')[0]['code']);
        $otpErrorCodes = array_column(
            array_filter($result->json('errors'), fn(array $error) => ($error['field'] ?? null) === 'otp'),
            'code',
        );
        $this->assertContains('validation.prohibited', $otpErrorCodes);
        $this->assertGuest();
    }

    public function testLoginWithOtpRequiredButNotConfiguredBeforeDeadlineWillPass(): void
    {
        // OTP setup is required soon but the deadline has not passed, so login still succeeds.
        $user = $this->createUser([
            'password_expire_at' => null,
            'otp_required_at' => now()->addDay(),
        ]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
        ]);

        $result->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function testLoginWithOtpRequiredButNotConfiguredAfterDeadlineWillFail(): void
    {
        // The deadline to configure OTP has passed and it is not configured, so login is blocked.
        $user = $this->createUser([
            'password_expire_at' => null,
            'otp_required_at' => now()->subDay(),
        ]);

        $result = $this->post(static::URL_LOGIN, [
            'email' => $user->email,
            'password' => self::CORRECT_PASSWORD,
        ]);

        $result->assertUnauthorized();
        $this->assertEquals('exception.bad_credentials', $result->json('errors')[0]['code']);
        $this->assertGuest();
    }

    public function testLogoutWillPass(): void
    {
        $user = $this->createUser();
        $this->actingAsUser($user);

        $result = $this->post(static::URL_LOGOUT);

        $result->assertOk();
        $this->assertGuest();
    }

    public function testChangePasswordWithInvalidRepeatWillFail(): void
    {
        $user = $this->createUser();
        $this->actingAsUser($user);

        $result = $this->post(static::URL_PASSWORD, [
            'current' => self::CORRECT_PASSWORD,
            'password' => self::VALID_PASSWORD . 'A',
            'repeat' => self::VALID_PASSWORD . 'B',
        ]);

        $result->assertBadRequest();
    }

    public function testChangePasswordWithInvalidRegexWillFail(): void
    {
        $user = $this->createUser();
        $this->actingAsUser($user);

        $result = $this->post(static::URL_PASSWORD, [
            'current' => self::CORRECT_PASSWORD,
            'password' => 'password',
            'repeat' => 'password',
        ]);

        $result->assertBadRequest();
    }

    public function testChangePasswordWithInvalidCurrentWillFail(): void
    {
        $user = $this->createUser();
        $this->actingAsUser($user);

        $result = $this->post(static::URL_PASSWORD, [
            'current' => self::CORRECT_PASSWORD . '1',
            'password' => self::VALID_PASSWORD,
            'repeat' => self::VALID_PASSWORD,
        ]);

        $result->assertBadRequest();
    }

    public function testChangePasswordNotLoggedWillFail(): void
    {
        $data = [
            'current' => self::CORRECT_PASSWORD,
            'password' => self::VALID_PASSWORD,
            'repeat' => self::VALID_PASSWORD,
        ];

        $result = $this->post(static::URL_PASSWORD, $data);

        $result->assertUnauthorized();
    }

    public function testChangePasswordWillPass(): void
    {
        $user = $this->createUser();
        $this->actingAsUser($user);

        $result = $this->post(static::URL_PASSWORD, [
            'current' => self::CORRECT_PASSWORD,
            'password' => self::VALID_PASSWORD,
            'repeat' => self::VALID_PASSWORD,
        ]);

        $result->assertOk();
        $this->assertAuthenticatedAs($user);
        // The new password is now the valid credential.
        $this->assertTrue(Auth::validate(['email' => $user->email, 'password' => self::VALID_PASSWORD]));
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
                    'userId',
                    'verified',
                    'globalAdmin',
                ],
            ],
        ];
    }
}
