<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Facility;
use App\Services\Facility\CreateFacilityService;
use App\Services\Facility\UpdateFacilityService;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

class AdminFacilityController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OA\Post(
        path: '/api/v1/admin/facility',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Create facility',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['name', 'url'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Test'),
                    new OA\Property(property: 'url', type: 'string', example: 'test-123'),
                ]
            )
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable|ApiException */
    public function post(CreateFacilityService $service): JsonResponse
    {
        $data = $this->validate(Facility::getInsertValidator(['name', 'url']));

        $result = $service->handle($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/admin/facility/{facility}',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Update facility',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Test'),
                    new OA\Property(property: 'url', type: 'string', example: 'test-123'),
                ]
            )
        ),
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'facility',
                description: 'Facility id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            )],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable|ApiException */
    public function patch(UpdateFacilityService $service): JsonResponse
    {
        $facility = $this->getFacilityOrFail();
        $data = $this->validate(Facility::getPatchValidator(['name', 'url'], $facility));

        $service->handle($facility, $data);

        return new JsonResponse();
    }
}
