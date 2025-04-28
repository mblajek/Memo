<?php

namespace App\Notification\Meeting;

use App\Models\Enums\NotificationMethod;

class MeetingNotification
{
    public function __construct(
        public string $userId,
        public NotificationMethod $notificationMethodDictId,
    ) {
    }
}
