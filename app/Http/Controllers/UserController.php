<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Resources\MemberResource;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Rules\Valid;
use App\Services\User\ChangePasswordService;
use App\Services\User\StorageService;
use App\Services\User\UpdateUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;
use Throwable;

/** System endpoints without authorisation */
class UserController extends ApiController
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
    public function login(Request $request): JsonResponse
    {
        if (PermissionMiddleware::permissions()->globalAdmin) {
            $developer = $this->validate(['developer' => Valid::bool(sometimes: true)])['developer'] ?? null;
            if (is_bool($developer)) {
                $request->session()->put('developer_mode', $developer);
                return new JsonResponse();
            }
        }

        // on password rehash, event listener cannot use PermissionMiddleware::user() to fill updated_by
        User::updating(function (User $user) {
            if (array_keys($user->getDirty()) !== ['password']) {
                FatalExceptionFactory::unexpected()->throw();
            }
        });

        User::updating(fn(User $user) => // rehash password cannot fill updated_by with PermissionMiddleware::user()
            (array_keys($user->getDirty()) === ['password']) || FatalExceptionFactory::unexpected()->throw());
        if (Auth::attempt($this->validate(['email' => Valid::string(['email']), 'password' => Valid::string()]))) {
            $request->session()->forget('developer_mode');
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
    public function patch(UpdateUserService $service): JsonResponse
    {
        $user = $this->getUserOrFail();
        $data = $this->validate([
            'last_login_facility_id' => 'nullable|uuid|exists:facilities,id|sometimes',
        ]);
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
            ),
        ],
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
        DB::withoutPretending();
        return new JsonResponse([
            'data' => [
                'user' => UserResource::make($this->getUserOrFail()),
                'permissions' => PermissionResource::make(PermissionMiddleware::permissions()),
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
    public function password(ChangePasswordService $changePasswordService): JsonResponse
    {
        $data = $this->validate([
            'current' => 'bail|required|string|current_password',
            'repeat' => 'bail|required|string|same:password',
            'password' => ['bail', 'required', 'string', 'different:current', User::getPasswordRules()],
        ]);

        $changePasswordService->handle($data);

        return new JsonResponse();
    }

    #[OA\Put(
        path: '/api/v1/user/storage/{key}',
        description: new PermissionDescribe([Permission::unverified, Permission::verified]),
        summary: 'Update user storage, send null value to unset key',
        requestBody: new OA\RequestBody(content: new OA\JsonContent(example: '{}')),
        tags: ['User'],
        parameters: [
            new OA\Parameter(
                name: 'key',
                description: 'Storage key',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', example: ''),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException */
    public function storagePut(StorageService $storageService, Request $request, string $key): JsonResponse
    {
        return $storageService->put($this->getUserOrFail(), $key, $request->getContent());
    }

    #[OA\Get(
        path: '/api/v1/user/storage/{key}',
        description: new PermissionDescribe([Permission::unverified, Permission::verified]),
        summary: 'Read user storage, send empty key to list keys',
        tags: ['User'],
        parameters: [
            new OA\Parameter(
                name: 'key',
                description: 'Storage key',
                in: 'path',
                allowEmptyValue: true,
                schema: new OA\Schema(type: 'string', example: ''),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )]
    public function storageGet(StorageService $storageService, string $key = ''): JsonResponse
    {
        return $storageService->get($this->getUserOrFail(), $key);
    }
}
