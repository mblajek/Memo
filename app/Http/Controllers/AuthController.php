<?php

namespace App\Http\Controllers;

use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\User;
use App\Rules\Valid;
use App\Services\System\LogService;
use App\Services\User\ChangePasswordService;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;
use PragmaRX\Google2FA\Google2FA;
use Psr\Log\LogLevel;
use Throwable;

/** System endpoints without authorisation */
class AuthController extends ApiController
{

    private const string SESSION_OTP_SECRET_CANDIDATE = 'otp_secret_candidate';

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::loggedIn)->except(['login', 'logout']);
    }

    #[OA\Post(
        path: '/api/v1/user/login',
        description: new PermissionDescribe(Permission::any),
        summary: 'User login',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'test@test.pl'),
                    new OA\Property(property: 'password', type: 'string', example: 'Pass123'),
                    new OA\Property(property: 'otp', type: 'string', example: '123456'),
                ]
            )
        ),
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function login(Request $request, LogService $logService): JsonResponse
    {
        if (PermissionMiddleware::permissions()->globalAdmin) {
            $developer = $this->validate(['developer' => Valid::bool(sometimes: true)])['developer'] ?? null;
            if (is_bool($developer)) {
                $request->session()->put(PermissionMiddleware::SESSION_DEVELOPER_MODE, $developer);
                return new JsonResponse();
            }
        }
        $authData = $this->validate([
            'email' => Valid::trimmed(['email']),
            'password' => Valid::string(),
        ]);
        $validateResult = Auth::validate($authData);
        $user = User::fromAuthenticatable(Auth::getLastAttempted());
        $now = new DateTimeImmutable();
        // An expired password is treated as wrong password.
        $isPasswordValid = $validateResult && $user !== null &&
            ($user->password_expire_at === null || $user->password_expire_at > $now);

        if ($isPasswordValid) {
            if (Validator::make($authData, ['password' => User::getPasswordRules()])->fails()) {
                // The password does not pass validation, i.e. it became leaked,
                // or no longer satisfies the requirements that changed.
                // Log in correctly but set password expiration time.
                $maxPasswordExpireAt = $now->modify('+2week');
                if ($user->password_expire_at === null || $user->password_expire_at > $maxPasswordExpireAt) {
                    $user->fill(['password_expire_at' => $maxPasswordExpireAt])->saveQuietly();
                }
            }

            if ($user->otp_secret !== null) {
                ['otp' => $otpData] = $this->validate(['otp' => Valid::trimmed()]);

                $google2fa = new Google2FA();
                // OTP is configured.
                $otpVerifyResult = $google2fa->verifyKeyNewer(
                    secret: $user->otp_secret,
                    key: $otpData,
                    oldTimestamp: $user->otp_used_ts,
                );
                if (is_int($otpVerifyResult)) {
                    $user->fill(['otp_used_ts' => $otpVerifyResult])->saveQuietly();
                }
                $isAuthValid = ($otpVerifyResult !== false);
            } else {
                $this->validate(['otp' => 'prohibited']);

                if ($user->otp_required_at !== null) {
                    // OTP is required, but not yet configured.
                    if ($user->otp_required_at < $now) {
                        // The deadline for setting up OTP has passed - do not allow to log in.
                        $isAuthValid = false;
                    } else {
                        // Setting up OTP is required soon, but the login is successful.
                        $isAuthValid = true;
                    }
                } else {
                    // OTP is not required and not configured.
                    $isAuthValid = true;
                }
            }
        } else {
            $isAuthValid = false;
        }

        $logService->addEntry(
            request: $request,
            source: ($user === null) ? 'user_login_unknown'
                : ($isAuthValid ? 'user_login_success' : 'user_login_failure'),
            logLevel: LogLevel::INFO,
            message: $authData['email'],
            user: $user,
        );

        if (!$isAuthValid) {
            Auth::logout();
            return ExceptionFactory::badCredentials()->render();
        }
        Auth::login($user);
        $request->session()->forget(PermissionMiddleware::SESSION_DEVELOPER_MODE);
        $request->session()->regenerate();
        $this->setSessionHashHash($request, $user);
        return new JsonResponse();
    }

    #[OA\Post(
        path: '/api/v1/user/logout',
        description: new PermissionDescribe(Permission::any),
        summary: 'User logout',
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
        ]
    )]
    public function logout(): JsonResponse
    {
        Auth::logout();
        return new JsonResponse();
    }

    #[OA\Post(
        path: '/api/v1/user/password',
        description: new PermissionDescribe([Permission::loggedIn]),
        summary: 'Change user password',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['current', 'password', 'repeat'],
                properties: [
                    new OA\Property(property: 'current', type: 'string', example: '123456'),
                    new OA\Property(property: 'password', type: 'string', example: '345678'),
                    new OA\Property(property: 'repeat', type: 'string', example: '345678'),
                ]
            )
        ),
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable */
    public function password(Request $request, ChangePasswordService $changePasswordService): JsonResponse
    {
        $data = $this->validate([
            'current' => Valid::string(['current_password']),
            'repeat' => Valid::string(['same:password']),
            'password' =>  Valid::string(['different:current', User::getPasswordRules()]),
        ]);

        $user = $this->getUserOrFail();
        $changePasswordService->handle($request, $user, $data['password']);
        $this->setSessionHashHash($request, $user);

        return new JsonResponse();
    }

    private function setSessionHashHash(Request $request, User $user): void
    {
        $request->session()->put(PermissionMiddleware::SESSION_PASSWORD_HASH_HASH, $user->passwordHashHash());
    }

    #[OA\Post(
        path: '/api/v1/user/otp/generate',
        description: new PermissionDescribe([Permission::loggedIn]),
        summary: 'Generate OTP secret to configure OTP',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['password'],
                properties: [
                    new OA\Property(property: 'password', type: 'string', example: 'password123'),
                ]
            )
        ),
        tags: ['User'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', properties: [
                            new OA\Property(property: 'otpSecret', type: 'string', example: 'AAAAAAAAAAAA'),
                            new OA\Property(property: 'validUntil', type: 'string', format: 'date-time', example: '2023-10-01T12:00:00Z'),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )]
    public function otpGenerate(Request $request): JsonResponse
    {
        $this->validate(['password' => Valid::string(['current_password'])]);
        $user = $this->getUserOrFail();
        if ($user->otp_secret !== null) {
            return ExceptionFactory::forbidden()->render();
        }
        $google2fa = new Google2FA();
        $otpSecret = $google2fa->generateSecretKey(32);
        $validUntil = new DateTimeImmutable()->modify('+1minute');
        $request->session()->put(self::SESSION_OTP_SECRET_CANDIDATE, [
            'otp_secret' => $otpSecret,
            'valid_until' => $validUntil,
        ]);
        return new JsonResponse([
            'data' => [
                'otpSecret' => $otpSecret,
                'validUntil' => DateHelper::toZuluString($validUntil),
            ],
        ]);
    }

    #[OA\Post(
        path: '/api/v1/user/otp/configure',
        description: new PermissionDescribe([Permission::loggedIn]),
        summary: 'Configure OTP',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['otp'],
                properties: [
                    new OA\Property(property: 'otp', type: 'string', example: '123456'),
                ]
            )
        ),
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )]
    public function otpConfigure(Request $request, LogService $logService): JsonResponse
    {
        $otp = $this->validate(['otp' => Valid::string()])['otp'];
        $user = $this->getUserOrFail();
        $storedData = $request->session()->get(self::SESSION_OTP_SECRET_CANDIDATE);
        $now = new DateTimeImmutable();
        if ($storedData === null || $now > $storedData['valid_until']) {
            $request->session()->forget(self::SESSION_OTP_SECRET_CANDIDATE);
            return ExceptionFactory::forbidden()->render();
        }
        $google2fa = new Google2FA();
        $otpVerifyResult = $google2fa->verifyKey($storedData['otp_secret'], $otp);
        if ($otpVerifyResult === false) {
            // Don't remove the values from session, give the user another chance.
            return ExceptionFactory::badCredentials()->render();
        }
        $user->fill([
            'otp_secret' => $storedData['otp_secret'],
            'otp_used_ts' => $otpVerifyResult,
        ])->saveQuietly();
        $logService->addEntry(
            request: $request,
            source: 'user_otp_configure',
            logLevel: LogLevel::INFO,
            message: null,
            user: $user,
        );
        return new JsonResponse();
    }

}
