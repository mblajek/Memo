<?php

namespace App\Http\Resources;

use App\Models\Enums\AttendanceType;
use App\Models\MeetingAttendant;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingAttendantResource',
    properties: [
        new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'meetingId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(property: 'attendanceType', type: 'string', enum: AttendanceType::class, example: 'client'),
        new OA\Property(property: 'attendanceStatusDictId', type: 'string', format: 'uuid', example: 'UUID'),
    ]
)] /**
 * @method __construct(MeetingAttendant $resource)
 * @mixin MeetingAttendant
 */
class MeetingAttendantResource extends AbstractJsonResource
{

    protected static function getMappedFields(): array
    {
        return [
            'id' => true,
            'meetingId' => true,
            'userId' => true,
            'attendanceType' => true,
            'attendanceStatusDictId' => true,
        ];
    }
}
