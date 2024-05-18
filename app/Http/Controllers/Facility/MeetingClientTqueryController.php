<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Tquery\Engine\TqService;
use App\Tquery\OpenApi\OpenApiGet;
use App\Tquery\OpenApi\OpenApiPost;
use App\Tquery\Tables\MeetingClientTquery;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class MeetingClientTqueryController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
    }

    private function getTqService(): TqService
    {
        return App::make(MeetingClientTquery::class, ['facility' => $this->getFacilityOrFail()]);
    }

    #[OpenApiGet(
        path: '/api/v1/facility/{facility}/meeting/client/tquery',
        permissions: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Facility meetings tquery',
        tag: 'Facility meeting',
        parameters: [new FacilityParameter()],
    )]
    public function get(): JsonResponse
    {
        return new JsonResponse($this->getTqService()->getConfigArray());
    }

    #[OpenApiPost(
        path: '/api/v1/facility/{facility}/meeting/client/tquery',
        permissions: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Facility meetings tquery',
        tag: 'Facility meeting',
        parameters: [new FacilityParameter()],
    )]
    public function post(
        Request $request,
    ): JsonResponse {
        return new JsonResponse($this->getTqService()->query($request));
    }
}
