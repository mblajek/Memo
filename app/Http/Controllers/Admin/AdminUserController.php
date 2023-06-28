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
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
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
        return AdminUserResource::collection(User::query()->with(['members'])->get());
    }

    #[OA\Post(
        path: '/api/v1/admin/user',
        description: 'Permissions: ' . Permission::globalAdmin->name,
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
    public function post(Request $request, CreateUserService $service): JsonResponse
    {
        $data = $request->validate(User::getInsertValidator([
            'name',
            'email',
            'has_email_verified',
            'password',
            'password_expire_at',
            'has_global_admin',
        ]));

        $result = $service->handle($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/admin/user/{user}',
        description: 'Permissions: ' . Permission::globalAdmin->name,
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
            )],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException|Throwable */
    public function patch(User $user, Request $request, UpdateUserService $service): JsonResponse
    {
        $data = $request->validate(User::getPatchValidator([
            'name',
            'email',
            'has_email_verified',
            'password',
            'password_expire_at',
            'has_global_admin',
        ], $user));

        $service->handle($user, $data);

        return new JsonResponse();
    }
}
