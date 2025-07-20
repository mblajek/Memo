<?php

namespace App\Notification;

use App\Models\Notification;
use Illuminate\Contracts\Debug\ExceptionHandler;

abstract readonly class AbstractNotificationSendService
{
    public function __construct(
        protected ExceptionHandler $handler,
    ) {
    }

    abstract public function sendNotification(Notification $notification): ?string;
}
