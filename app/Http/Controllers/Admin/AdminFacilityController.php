<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Admin\AdminFacilityResource;
use App\Models\Facility;
use App\Services\Facility\CreateFacilityService;
use App\Services\Facility\UpdateFacilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;
use Throwable;

class AdminFacilityController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OA\Get(
        path: '/api/v1/admin/facility/list',
        description: new PermissionDescribe([Permission::globalAdmin]),
        summary: 'All facilities',
        tags: ['Admin'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(ref: '#/components/schemas/AdminFacilityResource'),
                    ),
                ]),
            ),
        ]
    )]
    public function list(): JsonResource
    {
        return AdminFacilityResource::collection(Facility::query()->get());
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
                    new OA\Property(property: 'meetingNotificationTemplateSubject', type: 'string'),
                    new OA\Property(property: 'meetingNotificationTemplateMessage', type: 'string'),
                ],
            ),
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                ]),
            ])),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable|ApiException */
    public function post(CreateFacilityService $service): JsonResponse
    {
        $data = $this->validate(Facility::getInsertValidator([
            'name',
            'url',
            'meeting_notification_template_subject',
            'meeting_notification_template_message',
        ]));

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
                    new OA\Property(property: 'meetingNotificationTemplateSubject', type: 'string'),
                    new OA\Property(property: 'meetingNotificationTemplateMessage', type: 'string'),
                ],
            ),
        ),
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'facility',
                description: 'Facility id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable|ApiException */
    public function patch(UpdateFacilityService $service): JsonResponse
    {
        $facility = $this->getFacilityOrFail();
        $data = $this->validate(Facility::getPatchValidator([
            'name',
            'url',
            'meeting_notification_template_subject',
            'meeting_notification_template_message',
        ], $facility));

        $service->handle($facility, $data);

        return new JsonResponse();
    }
}
