<?php

namespace App\Http\Resources\Meeting;

use App\Http\Resources\AbstractJsonResource;
use App\Models\MeetingAttendant;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingClientResource',
    properties: [
        new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'attendanceStatusDictId', type: 'string', format: 'uuid', example: 'UUID', nullable: true),
    ]
)] /**
 * @method __construct(MeetingAttendant $resource)
 * @mixin MeetingAttendant
 */
class MeetingClientResource extends AbstractJsonResource
{
    protected static function getMappedFields(): array
    {
        return [
            'userId' => true,
            'attendanceStatusDictId' => true,
        ];
    }
}
