<?php

namespace App\Notification\Meeting;

class MeetingNotification
{
    public function __construct(
        public string $userId,
        public string $notificationMethodDictId,
        public ?string $subject,
    ) {
    }
}
