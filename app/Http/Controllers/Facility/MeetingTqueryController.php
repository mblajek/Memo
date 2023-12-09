<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Tquery\Engine\TqService;
use App\Tquery\OpenApi\OpenApiGet;
use App\Tquery\OpenApi\OpenApiPost;
use App\Tquery\Tables\MeetingTquery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class MeetingTqueryController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    private function getTqService(): TqService
    {
        return App::make(MeetingTquery::class, ['facility' => $this->getFacilityOrFail()]);
    }

    #[OpenApiGet(
        path: '/api/v1/facility/{facility}/meeting/tquery',
        permissions: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'All facilities tquery',
        tag: 'Facility meeting',
        isFacility: true,
    )]
    public function get(): JsonResponse
    {
        return new JsonResponse($this->getTqService()->getConfigArray());
    }

    #[OpenApiPost(
        path: '/api/v1/facility/{facility}/meeting/tquery',
        permissions: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'All facilities tquery',
        tag: 'Facility meeting',
        isFacility: true,
    )]
    public function post(
        Request $request,
    ): JsonResponse {
        return new JsonResponse($this->getTqService()->query($request));
    }
}
