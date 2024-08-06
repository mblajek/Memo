<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Meeting\MeetingResource;
use App\Models\MeetingResource as MeetingResourceModel;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Rules\UniqueWithMemoryRule;
use App\Rules\Valid;
use App\Services\Meeting\MeetingCloneService;
use App\Services\Meeting\MeetingService;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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
                    new OA\Property(property: 'notes', type: 'string', example: '', nullable: true),
                    new OA\Property(property: 'startDayminute', type: 'int', example: 600),
                    new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
                    new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'isRemote', type: 'bool', example: false),
                    new OA\Property(
                        property: 'staff', type: 'array', items: new OA\Items(
                        required: ['userId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
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
                        property: 'clients', type: 'array', items: new OA\Items(
                        required: ['userId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
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
        parameters: [new FacilityParameter()],
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
                'staff',
                'staff.*',
                'staff.*.user_id',
                'staff.*.attendance_status_dict_id',
                'clients',
                'clients.*',
                'clients.*.user_id',
                'clients.*.attendance_status_dict_id',
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
        summary: 'Get facility meetings',
        tags: ['Facility meeting'],
        parameters: [new FacilityParameter(), new OA\Parameter(name: 'in', in: 'query')],
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
    public function list(Facility $facility): JsonResource
    {
        $meetingsQuery = Meeting::query()->where('facility_id', $facility->id);
        $this->applyRequestIn($meetingsQuery);
        return MeetingResource::collection($meetingsQuery->with(['attendants', 'resources'])->get());
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/meeting/{meeting}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Update facility meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'typeDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'date', type: 'string', example: '2023-12-13'),
                    new OA\Property(property: 'notes', type: 'string', example: '', nullable: true),
                    new OA\Property(property: 'startDayminute', type: 'int', example: 600),
                    new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
                    new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'isRemote', type: 'bool', example: false),
                    new OA\Property(
                        property: 'staff', type: 'array', items: new OA\Items(
                        required: ['userId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
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
                        property: 'clients', type: 'array', items: new OA\Items(
                        required: ['userId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
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
                'resources.*',
                'resources.*.resource_dict_id',
            ])
        );
        $meetingService->patch($meeting, $data);
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/facility/{facility}/meeting/{meeting}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Delete facility meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'series',
                        type: 'string',
                        enum: ['one', 'from_this', 'from_next', 'all'],
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
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(
                properties: [
                    new OA\Property(property: 'count', type: 'int'),
                ]
            )
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException */
    public function delete(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        Meeting $meeting,
    ): JsonResponse {
        $meeting->belongsToFacilityOrFail();
        /** @var 'one'|'from_this'|'from_next'|'all' $series */
        if ($meeting->from_meeting_id) {
            $series = $this->validate([
                'series' => Valid::string([Rule::in(['one', 'from_this', 'from_next', 'all'])], sometimes: true),
            ])['series'] ?? 'one';
        } else {
            $series = $this->validate([
                'series' => Valid::string([Rule::in(['one'])], sometimes: true),
            ])['series'] ?? 'one';
        }
        if ($series === 'one') {
            $ids = [$meeting->id];
        } else {
            $query = DB::query()
                ->select('meetings.id')
                ->where('base_meeting.id', $meeting->id)
                ->from('meetings as base_meeting')
                ->join('meetings', 'meetings.from_meeting_id', 'base_meeting.from_meeting_id');
            if ($series === 'from_this' || $series === 'from_next') {
                $query->whereRaw(
                    '(`base_meeting`.`date` < `meetings`.`date`'
                    . ' or (`base_meeting`.`date` = `meetings`.`date`'
                    . ' and (`base_meeting`.`start_dayminute` < `meetings`.`start_dayminute`'
                    . ' or (`base_meeting`.`start_dayminute` = `meetings`.`start_dayminute`'
                    . ' and `base_meeting`.`id` <= `meetings`.`id`))))',
                );
            }
            if ($series === 'from_next') {
                $query->whereRaw('`base_meeting`.`id` != `meetings`.`id`');
            }
            $ids = $query->get()->pluck('id')->toArray();
        }

        DB::transaction(function () use ($ids) {
            MeetingAttendant::query()->whereIn('meeting_id', $ids)->delete();
            MeetingResourceModel::query()->whereIn('meeting_id', $ids)->delete();
            Meeting::query()->whereIn('id', $ids)->delete();
        });
        return new JsonResponse(['count' => count($ids)]);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/meeting/{meeting}/clone',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Clone meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['dates', 'interval'],
                properties: [
                    new OA\Property(
                        property: 'date', type: 'array',
                        items: new OA\Items(type: 'string', example: '2023-12-13'),
                    ),
                    new OA\Property(property: 'interval', type: 'string', example: '1d'),
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
            new OA\Response(response: 201, description: 'Created many'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable */
    public function clone(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        Meeting $meeting,
        MeetingCloneService $meetingCloneService,
    ): JsonResponse {
        $meeting->belongsToFacilityOrFail();
        ['dates' => $dates, 'interval' => $interval] = $this->validate([
            'dates' => Valid::list(['max:100']),
            'dates.*' => Valid::date([new UniqueWithMemoryRule('dates')]),
            'interval' => Valid::trimmed(['ascii'], max: 32),
        ]);

        $ids = $meetingCloneService->clone($meeting, $dates, $interval);

        return new JsonResponse(data: ['data' => ['ids' => $ids]], status: 201);
    }
}
