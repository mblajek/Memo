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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;
use Psr\Log\LogLevel;
use Throwable;

/** System endpoints without authorisation */
class AuthController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::unverified, Permission::verified)->except(['login', 'logout']);
    }

    #[OA\Post(
        path: '/api/v1/user/login',
        description: new PermissionDescribe(Permission::any),
        summary: 'User login',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['email', 'password'], properties: [
                new OA\Property(property: 'email', type: 'string', example: 'test@test.pl'),
                new OA\Property(property: 'password', type: 'string', example: '123456'),
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
        $authData = $this->validate(['email' => Valid::string(['email']), 'password' => Valid::string()]);
        $authValid = Auth::validate($authData);
        $user = User::fromAuthenticatable(Auth::getLastAttempted());

        $logService->addEntry(
            request: $request,
            source: ($user === null) ? 'user_login_unknown'
                : ($authValid ? 'user_login_success' : 'user_login_failure'),
            logLevel: LogLevel::INFO,
            message: $authData['email'],
            user: $user,
        );

        if ($authValid) {
            Auth::login($user);
            $request->session()->forget('developer_mode');
            $request->session()->regenerate();
            $this->setSessionHashHash($request, $user);
            return new JsonResponse();
        } else {
            Auth::logout();
            return ExceptionFactory::badCredentials()->render();
        }
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
        description: new PermissionDescribe([Permission::unverified, Permission::verified]),
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
