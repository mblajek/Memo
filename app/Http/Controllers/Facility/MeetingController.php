<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\MeetingResource;
use App\Models\Facility;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;
use Throwable;

class MeetingController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/meeting',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Create meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['name', 'url'],
                properties: [
                    new OA\Property(property: 'typeDictId', type: 'string', example: 'UUID'),
                ]
            )
        ),
        tags: ['Facility meeting'],
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
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable|ApiException */
    public function post(): JsonResponse
    {
        $data = $this->validate(Meeting::getInsertValidator(['type_dict_id']));

        $result = $data;

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Get(
        path: '/api/v1/facility/{facility}/meeting/list',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Meetings in the facility',
        tags: ['Facility meeting'],
        parameters: [
            new OA\Parameter(
                name: 'facility',
                description: 'Facility id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
            new OA\Parameter(name: 'in', in: 'query'),
        ],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/MeetingResource'),
                ),
            ])
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function facilityMeetingList(Facility $facility): JsonResource
    {
        $meetingsQuery = Meeting::query()->where('facility_id', $facility->id);
        $this->applyRequestIn($meetingsQuery);
        return MeetingResource::collection($meetingsQuery->with(['attendants', 'resources'])->get());
    }

}
