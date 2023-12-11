<?php

namespace App\Http\Resources\Meeting;

use App\Http\Resources\AbstractJsonResource;
use App\Models\Enums\AttendanceType;
use App\Models\Meeting;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'typeDictId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'notes', type: 'string', example: 'Test'),
        new OA\Property(property: 'date', type: 'string', format: 'date', example: '2023-11-27'),
        new OA\Property(property: 'startDayminute', type: 'int', example: 600),
        new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
        new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'createdBy', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'isRemote', type: 'bool', example: 'false'),
        new OA\Property(
            property: 'staff', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/MeetingStaffResource'
        )
        ),
        new OA\Property(
            property: 'clients', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/MeetingClientResource'
        )
        ),
        new OA\Property(
            property: 'resources', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/MeetingResourceResource'
        )
        ),
    ]
)] /**
 * @method __construct(Meeting $resource)
 * @mixin Meeting
 */
class MeetingResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'facilityId' => true,
            'categoryDictId' => true,
            'typeDictId' => true,
            'notes' => true,
            'date' => true,
            'startDayminute' => true,
            'durationMinutes' => true,
            'statusDictId' => true,
            'createdBy' => true,
            'isRemote' => true,
            'staff' => fn(self $meeting) => //
            MeetingStaffResource::collection($meeting->getAttendants(AttendanceType::Staff)),
            'clients' => fn(self $meeting) => //
            MeetingClientResource::collection($meeting->getAttendants(AttendanceType::Client)),
            'resources' => fn(self $meeting) => MeetingResourceResource::collection($meeting->resources),
        ];
    }
}
