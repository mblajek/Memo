<?php

namespace App\Notification;

enum NotificationStatus
{
    case deduplicated;
    case sent;

    case scheduled;
    case prepared;
    case sending;

    case error_address;
    case error_try1;
    case error_try2;
    case error;

    case skipped;

    public function baseStatus(): self
    {
        return match ($this) {
            self::deduplicated,
            self::sent => self::sent,
            self::scheduled => self::scheduled,
            self::prepared,
            self::sending => self::sending,
            self::error_address => self::error_address,
            self::error_try1,
            self::error_try2,
            self::error => self::error,
            self::skipped => self::skipped,
        };
    }
}
