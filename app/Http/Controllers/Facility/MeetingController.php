<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\MeetingResource;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
use App\Services\Meeting\MeetingService;
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
                required: ['typeDictId', 'date', 'startDayminute', 'durationMinutes', 'statusDictId', 'isRemote'],
                properties: [
                    new OA\Property(property: 'typeDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'date', type: 'string', example: '2023-12-13'),
                    new OA\Property(property: 'notes', type: 'string', example: '', nullable: true),
                    new OA\Property(property: 'startDayminute', type: 'int', example: 600),
                    new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
                    new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'isRemote', type: 'bool', example: false),
                    new OA\Property(
                        property: 'attendants', type: 'array', items: new OA\Items(
                        required: ['userId', 'attendanceType'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'attendanceType',
                                type: 'enum',
                                enum: AttendanceType::class,
                                example: 'client',
                            ),
                            new OA\Property(
                                property: 'attendanceStatusDictId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                                nullable: true,
                            ),
                        ]
                    )
                    ),
                    new OA\Property(
                        property: 'resources', type: 'array', items: new OA\Items(properties: [
                        new OA\Property(property: 'resourceDictId', type: 'string', example: 'UUID'),
                    ])
                    ),
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
    public function post(MeetingService $meetingService): JsonResponse
    {
        $data = $this->validate(
            Meeting::getInsertValidator([
                'type_dict_id',
                'date',
                'notes',
                'start_dayminute',
                'duration_minutes',
                'status_dict_id',
                'is_remote',
                'attendants',
                'attendants.*',
                'attendants.*.user_id',
                'attendants.*.attendance_type',
                'attendants.*.attendance_status_dict_id',
                'resources',
                'resources.*',
                'resources.*.resource_dict_id',
            ])
        );
        $result = $meetingService->create($this->getFacilityOrFail(), $data);

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
