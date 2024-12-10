<?php

namespace App\Http\Controllers\FacilityMeeting;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Meeting\MeetingResource;
use App\Models\Facility;
use App\Models\Meeting;
use App\Services\Meeting\MeetingService;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;
use Throwable;

class MeetingController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/meeting',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Create meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['typeDictId', 'date', 'startDayminute', 'durationMinutes', 'statusDictId', 'isRemote'],
                properties: [
                    new OA\Property(property: 'typeDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'date', type: 'string', example: '2023-12-13'),
                    new OA\Property(property: 'notes', type: 'string', example: null, nullable: true),
                    new OA\Property(property: 'startDayminute', type: 'int', example: 600),
                    new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
                    new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'isRemote', type: 'bool', example: false),
                    new OA\Property(
                        property: 'staff', type: 'array', items: new OA\Items(
                        required: ['userId', 'attendanceStatusDictId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'attendanceStatusDictId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                            ),
                        ]
                    )
                    ),
                    new OA\Property(
                        property: 'clients', type: 'array', items: new OA\Items(
                        required: ['userId', 'attendanceStatusDictId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'attendanceStatusDictId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                            ),
                            new OA\Property(
                                property: 'clientGroupId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                                nullable: true,
                            ),
                            new OA\Property(
                                property: 'notifications', type: 'array', items: new OA\Items(
                                required: ['notificationMethodDictId'],
                                properties: [
                                    new OA\Property(
                                        property: 'notificationMethodDictId',
                                        type: 'string',
                                        format: 'uuid',
                                        example: 'UUID',
                                    ),
                                ]
                            )
                            )
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
        parameters: [new FacilityParameter()],
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
                'staff',
                'staff.*',
                'staff.*.user_id',
                'staff.*.attendance_status_dict_id',
                'clients',
                'clients.*',
                'clients.*.user_id',
                'clients.*.attendance_status_dict_id',
                'clients.*.client_group_id',
                'clients.*.notifications',
                'clients.*.notifications.*',
                'clients.*.notifications.*.notification_method_dict_id',
                'resources',
                'resources.*',
                'resources.*.resource_dict_id',
                'from_meeting_id',
            ])
        );
        $result = $meetingService->create($this->getFacilityOrFail(), $data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Get(
        path: '/api/v1/facility/{facility}/meeting/list',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Get meetings',
        tags: ['Facility meeting'],
        parameters: [new FacilityParameter(), new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/MeetingResource'),
                ),
            ])
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function list(Facility $facility): JsonResource
    {
        $meetingsQuery = Meeting::query()->where('facility_id', $facility->id);
        $this->applyRequestIn($meetingsQuery);
        return MeetingResource::collection($meetingsQuery->with(['attendants', 'resources'])->get());
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/meeting/{meeting}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Update meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'typeDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'date', type: 'string', example: '2023-12-13'),
                    new OA\Property(property: 'notes', type: 'string', example: null, nullable: true),
                    new OA\Property(property: 'startDayminute', type: 'int', example: 600),
                    new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
                    new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'isRemote', type: 'bool', example: false),
                    new OA\Property(
                        property: 'staff', type: 'array', items: new OA\Items(
                        required: ['userId', 'attendanceStatusDictId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'attendanceStatusDictId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                            ),
                        ]
                    )
                    ),
                    new OA\Property(
                        property: 'clients', type: 'array', items: new OA\Items(
                        required: ['userId', 'attendanceStatusDictId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'attendanceStatusDictId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                            ),
                            new OA\Property(
                                property: 'clientGroupId',
                                type: 'string',
                                format: 'uuid',
                                example: null,
                                nullable: true,
                            ),
                            new OA\Property(
                                property: 'notifications', type: 'array', items: new OA\Items(
                                required: ['notificationMethodDictId'],
                                properties: [
                                    new OA\Property(
                                        property: 'notificationMethodDictId',
                                        type: 'string',
                                        format: 'uuid',
                                        example: 'UUID',
                                    ),
                                ],
                                nullable: true
                            )
                            )
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
            new FacilityParameter(),
            new OA\Parameter(
                name: 'meeting',
                description: 'Meeting id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException */
    public function patch(
        MeetingService $meetingService,
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        Meeting $meeting,
    ): JsonResponse {
        $meeting->belongsToFacilityOrFail();
        $data = $this->validate(
            Meeting::getPatchValidator([
                'type_dict_id',
                'date',
                'notes',
                'start_dayminute',
                'duration_minutes',
                'status_dict_id',
                'is_remote',
                'staff',
                'clients',
                'resources',
            ], $meeting) + Meeting::getInsertValidator([
                'staff.*',
                'staff.*.user_id',
                'staff.*.attendance_status_dict_id',
                'clients.*',
                'clients.*.user_id',
                'clients.*.attendance_status_dict_id',
                'clients.*.client_group_id',
                'clients.*.notifications',
                'clients.*.notifications.*',
                'clients.*.notifications.*.notification_method_dict_id',
                'resources.*',
                'resources.*.resource_dict_id',
            ])
        );
        $meetingService->patch($meeting, $data);
        return new JsonResponse();
    }
}
