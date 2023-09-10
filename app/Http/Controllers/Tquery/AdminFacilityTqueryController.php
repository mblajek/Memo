<?php

namespace App\Http\Controllers\Tquery;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Services\Tquery\OpenApi\OpenApiGet;
use App\Services\Tquery\OpenApi\OpenApiPost;
use App\Services\Tquery\Tables\AdminFacilityTquery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFacilityTqueryController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OpenApiGet(
        path: '/api/v1/admin/facility/tquery',
        permissions: new PermissionDescribe(Permission::globalAdmin),
        summary: 'All facilities tquery',
        tag: 'Admin',
    )]
    public function get(
        AdminFacilityTquery $tquery,
    ): JsonResponse {
        return new JsonResponse($tquery->getConfigArray());
    }

    #[OpenApiPost(
        path: '/api/v1/admin/facility/tquery',
        permissions: new PermissionDescribe(Permission::globalAdmin),
        summary: 'All facilities tquery',
        tag: 'Admin',
    )]
    public function post(
        AdminFacilityTquery $tquery,
        Request $request,
    ): JsonResponse {
        return new JsonResponse($tquery->query($request));
    }
}
