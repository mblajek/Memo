<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Resources\MemberResource;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\User\ChangePasswordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use OpenApi\Attributes as OA;
use Throwable;

/** System endpoints without authorisation */
class UserController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
        $this->permissionOneOf(Permission::unverified, Permission::verified)->only('status');
        $this->permissionOneOf(Permission::unverified, Permission::verified)->only('password');
    }

    #[OA\Post(
        path: '/api/v1/user/login',
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
    )] /** @throws ApiException */
    public function login(Request $request): JsonResponse
    {
        $loginData = $request->validate([
            'email' => 'bail|required|string|email',
            'password' => 'required|string',
        ]);
        if (Auth::attempt($loginData)) {
            $request->session()->regenerate();
            return new JsonResponse();
        }
        throw ExceptionFactory::unauthorised();
    }

    #[OA\Get(
        path: '/api/v1/user/status',
        summary: 'User status',
        tags: ['User'],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'user', ref: '#/components/schemas/UserResource', type: 'object'),
                    new OA\Property(
                        property: 'permissions', ref: '#/components/schemas/PermissionsResource', type: 'object'
                    ),
                    new OA\Property(
                        property: 'members', type: 'array', items: new OA\Items(
                        ref: '#/components/schemas/MemberResource'
                    )
                    ),
                ]
            )
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function status(): JsonResponse
    {
        $permissionObject = $this->getPermissionObject();
        /** @var User $user */
        $user = $permissionObject->user;

        return new JsonResponse([
            'data' => [
                'user' => UserResource::make($user),
                'permissions' => PermissionResource::make($permissionObject),
                'members' => MemberResource::collection($user->members),
            ],
        ]);
    }

    #[OA\Post(
        path: '/api/v1/user/logout',
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
        $data = $request->validate([
            'current' => 'bail|required|string|current_password',
            'password' => [
                'bail',
                'required',
                'string',
                'different:current',
                Password::min(8)->letters()->mixedCase()->numbers()->uncompromised(),
            ],
            'repeat' => 'bail|required|string|same:password',
        ]);

        $changePasswordService->handle($data);

        return new JsonResponse();
    }
}
