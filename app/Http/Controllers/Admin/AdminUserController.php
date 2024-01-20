<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\User;
use App\Services\User\CreateUserService;
use App\Services\User\UpdateUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;
use Throwable;

class AdminUserController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OA\Get(
        path: '/api/v1/admin/user/list',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'All users',
        tags: ['Admin'],
        parameters: [new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(
                    ref: '#/components/schemas/AdminUserResource'
                )
                ),
            ])
            ),
        ]
    )]
    public function list(): JsonResource
    {
        $userQuery = User::query();
        $this->applyRequestIn($userQuery);
        return AdminUserResource::collection($userQuery->with(['members'])->get());
    }

    #[OA\Post(
        path: '/api/v1/admin/user',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Create user',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['name', 'hasGlobalAdmin'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'email', type: 'string', example: 'jan@jan.pl'),
                    new OA\Property(property: 'hasEmailVerified', type: 'bool', example: false),
                    new OA\Property(property: 'password', type: 'string', example: 'password'),
                    new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
                    new OA\Property(property: 'hasGlobalAdmin', type: 'bool', example: false),
                ]
            )
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException|Throwable */
    public function post(CreateUserService $service): JsonResponse
    {
        $data = $this->validate(User::getInsertValidator());

        $result = $service->handle($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/admin/user/{user}',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Update user',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'email', type: 'string', example: 'jan@jan.pl'),
                    new OA\Property(property: 'hasEmailVerified', type: 'bool', example: false),
                    new OA\Property(property: 'password', type: 'string', example: 'password'),
                    new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
                    new OA\Property(property: 'hasGlobalAdmin', type: 'bool', example: false),
                ]
            )
        ),
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'user',
                description: 'User id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException|Throwable */
    public function patch(User $user, UpdateUserService $service): JsonResponse
    {
        $rules = User::getPatchValidator($user);
        $requestData = $this->validate($rules);
        $userAttributes = $service->getAttributesAfterPatch($user, $requestData);

        Validator::validate($userAttributes, User::getResourceValidator());

        $service->handle($user, $userAttributes);
        return new JsonResponse();
    }
}
