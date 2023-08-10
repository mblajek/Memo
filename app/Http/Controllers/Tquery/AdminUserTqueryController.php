<?php

namespace App\Http\Controllers\Tquery;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Services\Tquery\OpenApiGet;
use Illuminate\Http\JsonResponse;
use stdClass;

class AdminUserTqueryController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OpenApiGet(
        path: '/api/v1/admin/user/tquery',
        permissions: new PermissionDescribe(Permission::globalAdmin),
        summary: 'All users tquery',
        tag: 'Admin',
    )]
    public function get(): JsonResponse
    {
        return new JsonResponse([
            'data' => [
                'columns' => [
                    ['name' => 'id', 'type' => 'uuid'],
                    ['name' => 'name', 'type' => 'string'],
                    ['name' => 'email', 'type' => 'string'],
                    //todo: 'name' => 'lastLoginFacilityId', 'type' => 'facility' (?)
                    ['name' => 'lastLoginFacility', 'type' => 'string'],
                    ['name' => 'passwordExpireAt', 'type' => 'datetime'],
                    ['name' => 'hasPassword', 'type' => 'bool'],
                    ['name' => 'createdAt', 'type' => 'datetime'],
                    ['name' => 'updatedAt', 'type' => 'datetime'],
                    ['name' => 'hasEmailVerified', 'type' => 'bool'],
                    //todo: 'type' => 'user'
                    ['name' => 'createdBy', 'type' => 'string'],
                    ['name' => 'hasGlobalAdmin', 'type' => 'bool'],
                    ['name' => 'members', 'type' => 'text'],
                ],
                'customFilters' => new stdClass(),
            ],
        ]);
    }
}
