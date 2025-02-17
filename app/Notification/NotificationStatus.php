<?php

namespace App\Notification;

enum NotificationStatus
{
    case scheduled;

    case prepared;

//    case deduplicated; ?
    case sent;

    case sending;
    case error_address;
    case error_try1;
    case error_try2;
    case error;
}
