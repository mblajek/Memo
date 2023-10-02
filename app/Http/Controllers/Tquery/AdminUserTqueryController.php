<?php

namespace App\Http\Controllers\Tquery;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Tquery\OpenApi\OpenApiGet;
use App\Tquery\OpenApi\OpenApiPost;
use App\Tquery\Tables\AdminUserTquery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
    public function get(
        AdminUserTquery $tquery,
    ): JsonResponse {
        return new JsonResponse($tquery->getConfigArray());
    }

    #[OpenApiPost(
        path: '/api/v1/admin/user/tquery',
        permissions: new PermissionDescribe(Permission::globalAdmin),
        summary: 'All users tquery',
        tag: 'Admin',
    )]
    public function post(
        AdminUserTquery $tquery,
        Request $request,
    ): JsonResponse {
        return new JsonResponse($tquery->query($request));
    }
}
