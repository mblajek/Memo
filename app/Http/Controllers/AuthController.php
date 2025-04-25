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
            new OA\Response(response: 401, description: 'Unauthorised', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'otp_required', type: 'bool', example: 'true'),
                ]),
            ])),
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
            'email' => Valid::string(['email']),
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
                // The password does not pass validation, i.e. it became leaked, or no longer satisfies the requirements that changed.
                // Log in correctly but set password expiration time.
                $maxPasswordExpireAt = $now->modify('+2week');
                if ($user->password_expire_at === null || $user->password_expire_at > $maxPasswordExpireAt) {
                    $user->fill([
                        'password_expire_at' => DateHelper::toDbString($maxPasswordExpireAt)
                    ])->saveQuietly();
                }
            }

            $google2fa = new Google2FA();
            $otp = $this->validate(['otp' => Valid::string(sometimes: true)])['otp'] ?? null;
            if ($user->otp_secret !== null) {
                // OTP is configured.
                if ($otp === null) {
                    $exception = ExceptionFactory::unauthorised();
                    return new JsonResponse([
                        'data' => ['otp_required' => true],
                        'errors' => $exception->renderContent()['errors']
                    ], $exception->httpCode);
                }
                $otpVerifyResult = $google2fa->verifyKeyNewer(
                    $user->otp_secret,
                    $otp,
                    $user->otp_used_at?->getTimestamp()
                );
                if ($otpVerifyResult === false) {
                    $isAuthValid = false;
                } else {
                    $isAuthValid = true;
                    $user->fill(['otp_used_at' => DateHelper::toDbString($now)])->saveQuietly();
                }
            } else if ($user->otp_required_at !== null) {
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
        } else {
            $isAuthValid = false;
        }

        $logService->addEntry(
            request: $request,
            source: ($user === null) ? 'user_login_unknown' : ($isAuthValid ? 'user_login_success' : 'user_login_failure'),
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
        return new JsonResponse(['data' => ['otp_required' => false]]);
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
            'current' => 'bail|required|string|current_password',
            'repeat' => 'bail|required|string|same:password',
            'password' => ['bail', 'required', 'string', 'different:current', User::getPasswordRules()],
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
}
