<?php

namespace App\Http\Resources\Meeting;

use App\Http\Resources\AbstractJsonResource;
use App\Models\MeetingAttendant;
use App\Models\Notification;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MeetingClientResource',
    properties: [
        new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
        new OA\Property(
            property: 'attendanceStatusDictId',
            type: 'string',
            format: 'uuid',
            example: 'UUID',
        ),
        new OA\Property(
            property: 'clientGroupId',
            type: 'string',
            format: 'uuid',
            example: 'UUID',
            nullable: true,
        ),
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
            'clientGroupId' => true,
            'notifications' => fn(self $meetingAttendant) => $meetingAttendant->meeting->notifications
                ->where('user_id', $meetingAttendant->user_id)
                ->toBase()->map(fn(Notification $notification): array
                    => [
                    'subject' => $notification->subject,
                    'status' => $notification->status->baseStatus()->name,
                    'notificationMethodDictId' => $notification->notification_method_dict_id,
                ])->values()->all()
        ];
    }
}
