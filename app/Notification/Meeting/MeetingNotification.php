<?php

namespace App\Notification\Meeting;

use App\Models\Enums\NotificationMethod;
use App\Models\MeetingAttendant;

readonly class MeetingNotification
{
    public function __construct(
        public string $userId,
        public NotificationMethod $notificationMethodDictId,
        public ?MeetingAttendant $meetingAttendant = null,
    ) {
    }
}
