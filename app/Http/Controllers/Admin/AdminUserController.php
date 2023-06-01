<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\User;
use App\Services\User\CreateUserService;
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
        return AdminUserResource::collection(User::query()->get());
    }

    #[OA\Post(
        path: '/api/v1/admin/user',
        summary: 'Create user',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['name'],
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
        $data = $request->validate([
            'name' => 'required|string',
        ]);

        $result = $service->handle($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }
}
