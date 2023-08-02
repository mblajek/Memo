<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\MemberResource;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Rules\RequirePresent;
use App\Services\User\ChangePasswordService;
use App\Services\User\UpdateUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Throwable;

/** System endpoints without authorisation */
class UserController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
        $this->permissionOneOf(Permission::unverified, Permission::verified)->only(['patch', 'status', 'password']);
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
        Auth::logout();
        return ExceptionFactory::badCredentials()->render();
    }

    #[OA\Patch(
        path: '/api/v1/user',
        description: new PermissionDescribe([Permission::verified, Permission::unverified]),
        summary: 'Update logged user',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'lastLoginFacilityId', type: 'string', format: 'uuid', example: 'UUID'),
            ]
        )
        ),
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException|Throwable */
    public function patch(Request $request, UpdateUserService $service): JsonResponse
    {
        $user = $this->getUserOrFail();
        $data = $request->validate(
            User::getPatchValidator([
                'last_login_facility_id',
            ], $user)
        );
        $service->handle($user, $data);

        return new JsonResponse();
    }

    #[OA\Get(
        path: '/api/v1/user/status/{facility}',
        description: new PermissionDescribe([Permission::unverified, Permission::verified]),
        summary: 'User status',
        tags: ['User'],
        parameters: [
            new OA\Parameter(
                name: 'facility',
                description: 'Facility id',
                in: 'path',
                allowEmptyValue: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: ''),
            )],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data', type: 'array', items: new OA\Items(properties: [
                        new OA\Property(property: 'user', ref: '#/components/schemas/UserResource', type: 'object'),
                        new OA\Property(
                            property: 'permissions', ref: '#/components/schemas/PermissionsResource', type: 'object'
                        ),
                        new OA\Property(
                            property: 'members', type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/MemberResource')
                        ),
                    ])
                    ),
                ]
            )
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function status(): JsonResponse
    {
        return new JsonResponse([
            'data' => [
                'user' => UserResource::make($this->getUserOrFail()),
                'permissions' => PermissionResource::make($this->getPermissionObject()),
                'members' => MemberResource::collection($this->getUserOrFail()->members),
            ],
        ]);
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
        $data = $request->validate([
            'current' => 'bail|required|string|current_password',
            'repeat' => 'bail|required|string|same:password',
            'password' => array_filter(
                User::getInsertValidator(['password'])['password'],
                fn($rule) => !($rule instanceof RequirePresent)
            ),
        ]);

        $changePasswordService->handle($data);

        return new JsonResponse();
    }
}
