<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\MeetingResource;
use App\Models\Facility;
use App\Models\Meeting;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

class MeetingController  extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Get(
        path: '/api/v1/system/facility/{facility}/meeting/list',
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
