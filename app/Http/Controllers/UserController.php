<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Resources\MemberResource;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use App\Services\User\StorageService;
use App\Services\User\UpdateUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Throwable;

/** System endpoints without authorisation */
class UserController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::unverified, Permission::verified)->except(['login', 'logout']);
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
        $user = $this->getUserOrFail();
        return new JsonResponse([
            'data' => [
                'user' => UserResource::make($user),
                'permissions' => PermissionResource::make(PermissionMiddleware::permissions()),
                'members' => MemberResource::collection($user->activeMembers()),
            ],
        ]);
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
