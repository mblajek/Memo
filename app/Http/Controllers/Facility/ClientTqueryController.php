<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Tquery\Engine\TqService;
use App\Tquery\OpenApi\OpenApiGet;
use App\Tquery\OpenApi\OpenApiPost;
use App\Tquery\Tables\ClientTquery;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class ClientTqueryController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
    }

    private function getTqService(): TqService
    {
        return App::make(ClientTquery::class, ['facility' => $this->getFacilityOrFail()]);
    }

    #[OpenApiGet(
        path: '/api/v1/facility/{facility}/user/client/tquery',
        permissions: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Facility clients tquery',
        tag: 'Facility client',
        parameters: [new FacilityParameter()],
    )]
    public function get(): JsonResponse
    {
        return new JsonResponse($this->getTqService()->getConfigArray());
    }

    #[OpenApiPost(
        path: '/api/v1/facility/{facility}/user/client/tquery',
        permissions: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Facility clients tquery',
        tag: 'Facility client',
        parameters: [new FacilityParameter()],
    )]
    public function post(
        Request $request,
    ): JsonResponse {
        return new JsonResponse($this->getTqService()->query($request));
    }
}
