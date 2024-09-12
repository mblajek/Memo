<?php

namespace App\Http\Controllers\FacilityMeeting;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\MeetingResource as MeetingResourceModel;
use App\Rules\UniqueWithMemoryRule;
use App\Rules\Valid;
use App\Services\Meeting\MeetingCloneService;
use App\Utils\OpenApi\FacilityParameter;
use DateTimeImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;
use stdClass;
use Throwable;

class MeetingSeriesController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
    }


    #[OA\Delete(
        path: '/api/v1/facility/{facility}/meeting/{meeting}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Delete meeting',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'series',
                        type: 'string',
                        enum: ['one', 'from_this', 'from_next', 'all'],
                    ),
                    new OA\Property(
                        property: 'otherIds',
                        type: 'array',
                        items: new OA\Items(type: 'string', format: 'uuid'),
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
                    new OA\Property(property: 'data', properties: [
                        new OA\Property(property: 'count', type: 'int'),
                    ]),
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
        $data = $this->validate([
            'series' => Valid::string([
                Rule::in($meeting->from_meeting_id ? ['one', 'from_this', 'from_next', 'all'] : ['one']),
            ], sometimes: true),
            'other_ids' => Valid::list(sometimes: true, min: 0),
            'other_ids.*' => Valid::uuid([
                Rule::exists('meetings', 'id')->where('facility_id', $this->getFacilityOrFail()->id),
            ], sometimes: true),
        ]);
        /** @var 'one'|'from_this'|'from_next'|'all' $series */
        $series = $data['series'] ?? 'one';
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
        $ids = array_unique([...$ids, ...($data['other_ids'] ?? [])]);

        DB::transaction(function () use ($ids) {
            MeetingAttendant::query()->whereIn('meeting_id', $ids)->delete();
            MeetingResourceModel::query()->whereIn('meeting_id', $ids)->delete();
            Meeting::query()->whereIn('id', $ids)->delete();
        });
        return new JsonResponse(['data' => ['count' => count($ids)]]);
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
                    new OA\Property(property: 'interval', type: 'string', example: '1d', nullable: true),
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
            new OA\Response(response: 201, description: 'Created many', content: new OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', properties: [
                    new OA\Property(
                        property: 'ids', type: 'array', items: new OA\Items(
                        type: 'string',
                        example: '2023-12-13'
                    ),
                    ),
                ],
                ),
            ])),
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
            'interval' => Valid::trimmed(['ascii'], nullable: true, max: 32),
        ]);

        $ids = $meetingCloneService->clone($meeting, $dates, $interval);

        return new JsonResponse(data: ['data' => ['ids' => $ids]], status: 201);
    }


    #[OA\Post(
        path: '/api/v1/facility/{facility}/meeting/conflicts',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Find potential conflicts (system meetings ignored)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['samples'],
                properties: [
                    new OA\Property(
                        property: 'samples',
                        type: 'array',
                        items: new OA\Items(
                            required: ['date', 'startDayminute', 'durationMinutes'],
                            properties: [
                                new OA\Property(property: 'date', type: 'string', example: '2023-12-13'),
                                new OA\Property(property: 'startDayminute', type: 'int', example: 600),
                                new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
                            ]
                        )
                    ),
                    new OA\Property(property: 'staff', type: 'boolean'),
                    new OA\Property(property: 'clients', type: 'boolean'),
                    new OA\Property(property: 'resources', type: 'boolean'),
                    new OA\Property(
                        property: 'ignoreMeetingIds',
                        type: 'array',
                        items: new OA\Items(type: 'string', format: 'uuid'),
                    ),
                ]
            )
        ),
        tags: ['Facility meeting'],
        parameters: [new FacilityParameter()],
        responses: [
            new OA\Response(response: 200, description: 'Created many', content: new OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data',
                    type: 'array',
                    items: new OA\Items(properties: [
                        new OA\Property(property: 'staff', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'meetingIds', type: 'array', format: 'uuid',
                                items: new OA\Items(type: 'string', format: 'uuid', example: 'UUID')
                            ),
                        ])),
                        new OA\Property(property: 'clients', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'meetingIds', type: 'array', format: 'uuid',
                                items: new OA\Items(type: 'string', format: 'uuid', example: 'UUID')
                            ),
                        ])),
                        new OA\Property(property: 'resources', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(
                                property: 'meetingIds', type: 'array', format: 'uuid',
                                items: new OA\Items(type: 'string', format: 'uuid', example: 'UUID')
                            ),
                        ])),
                    ])
                ),
            ])),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable */
    public function conflicts(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
    ): JsonResponse {
        [
            'samples' => $samples,
            'staff' => $staff,
            'clients' => $clients,
            'resources' => $resources,
            'ignore_meeting_ids' => $ignoreMeetingIds,
        ] = $this->validate([
            'samples' => Valid::list(['max:100']),
            'samples.*' => Valid::array(['date', 'start_dayminute', 'duration_minutes']),
            ...Arr::prependKeysWith(Meeting::getInsertValidator([
                'date',
                'start_dayminute',
                'duration_minutes',
            ]), 'samples.*.'),
            'staff' => Valid::bool(sometimes: true),
            'clients' => Valid::bool(sometimes: true),
            'resources' => Valid::bool(sometimes: true),
            'ignore_meeting_ids' => Valid::list(sometimes: true, min: 0),
            'ignore_meeting_ids.*' => Valid::uuid([
                Rule::exists('meetings', 'id')->where('facility_id', $this->getFacilityOrFail()->id),
            ], sometimes: true),
        ]) + [
            'staff' => false,
            'clients' => false,
            'resources' => false,
            'ignore_meeting_ids' => [],
        ];

        if (!($conflictTypes = array_keys(array_filter(compact(['staff', 'clients', 'resources']))))) {
            return new JsonResponse(data: ['data' => array_fill_keys(array_keys($samples), new stdClass())]);
        }

        $commonQuery = Meeting::query()
            ->where('facility_id', $this->getFacilityOrFail()->id)
            ->whereNotIn('id', $ignoreMeetingIds)
            ->where('status_dict_id', '!=', Meeting::STATUS_CANCELLED)
            ->where('category_dict_id', '!=', Meeting::CATEGORY_SYSTEM);
        $startMinutesFromDate = "datediff(`meetings`.`date`, ?) * 1440 + `meetings`.`start_dayminute`";

        $meetingIdsGrouped = [];
        foreach (
            $samples as ['date' => $date, 'start_dayminute' => $startDayminute, 'duration_minutes' => $durationMinutes]
        ) {
            $dateObject = DateTimeImmutable::createFromFormat('Y-m-d', $date);
            $meetingIdsGrouped [] = $commonQuery->clone()
                ->whereBetween('date', [$dateObject->modify('-1day'), $dateObject->modify('+1day')])
                ->whereRaw("$startMinutesFromDate + `meetings`.`duration_minutes` > ?", [$date, $startDayminute])
                ->whereRaw("$startMinutesFromDate < ?", [$date, $startDayminute + $durationMinutes])
                ->get('id')->pluck('id')->toArray();
        }

        $meetingsData = [];
        foreach (
            Meeting::query()->whereIn('id', array_unique(array_merge(...$meetingIdsGrouped)))
                ->with(array_keys(array_filter(['attendants' => $staff || $clients, 'resources' => $resources])))
                ->get('id') as $meeting
        ) {
            $meetingsData[$meeting->id] = array_combine(
                $conflictTypes,
                array_map(fn(string $conflictType) => match ($conflictType) {
                    'staff' => $meeting->getAttendants(AttendanceType::Staff)->pluck('id')->toArray(),
                    'clients' => $meeting->getAttendants(AttendanceType::Client)->pluck('id')->toArray(),
                    'resources' => $meeting->resources->pluck('resource_dict_id')->toArray(),
                }, $conflictTypes),
            );
        }

        $response = [];
        foreach ($meetingIdsGrouped as $meetingIdsGroup) {
            $data = array_fill_keys($conflictTypes, []);
            foreach ($meetingIdsGroup as $meetingId) {
                foreach ($meetingsData[$meetingId] as $conflictType => $ids) {
                    foreach ($ids as $id) {
                        if (!array_key_exists($id, $data[$conflictType])) {
                            $data[$conflictType][$id] = ['id' => $id, 'meetingIds' => [$meetingId]];
                        } else {
                            $data[$conflictType][$id]['meetingIds'][] = $meetingId;
                        }
                    }
                }
            }
            $response[] = array_map(array_values(...), $data);
        }
        return new JsonResponse(data: ['data' => $response], status: 200);
    }
}
