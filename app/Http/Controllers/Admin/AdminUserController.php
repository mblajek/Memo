<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

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
        return AdminUserResource::collection(User::query()->get());
    }
}
