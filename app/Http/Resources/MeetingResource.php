<?php

namespace App\Http\Resources;

use App\Models\Meeting;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'typeDictId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'name', type: 'string', example: 'Test'),
        new OA\Property(property: 'notes', type: 'string', example: 'Test'),
        new OA\Property(property: 'date', type: 'string', format: 'date', example: '2023-11-27'),
        new OA\Property(property: 'startDayminute', type: 'int', example: 600),
        new OA\Property(property: 'durationMinutes', type: 'int', example: 60),
        new OA\Property(property: 'statusDictId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'createdBy', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(
            property: 'attendants', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/MeetingAttendantResource'
        )),
        new OA\Property(
            property: 'resources', type: 'array', items: new OA\Items(
            ref: '#/components/schemas/MeetingResourceResource'
        )),
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
            'name' => true,
            'notes' => true,
            'date' => fn(self $meeting) => $meeting->date->format('Y-m-d'),
            'startDayminute' => true,
            'durationMinutes' => true,
            'statusDictId' => true,
            'createdBy' => true,
            'attendants' => fn(self $meeting) => MeetingAttendantResource::collection($meeting->attendants),
            'resources' => fn(self $meeting) => MeetingResourceResource::collection($meeting->resources),
        ];
    }
}
