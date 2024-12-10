<?php

namespace App\Notification;

enum NotificationStatus
{
    case scheduled;
    case sent;
    case sending;
    case error_address;
    case error_try1;
    case error_try2;
    case error;
}
