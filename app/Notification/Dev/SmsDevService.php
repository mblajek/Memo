<?php

namespace App\Notification\Dev;

use App\Notification\Sms\AbstractSmsService;
use Illuminate\Support\Facades\Log;

readonly class SmsDevService extends AbstractSmsService
{
    protected const string ENV_FROM_NAME = 'SMS_DEV_FROM_NAME';

    public function sendPreparedSms(string $number, string $message): void
    {
        Log::channel('dev_notifications')->info($message, [
            'type' => 'sms',
            'fromName' => self::fromName(),
            'number' => $number,
        ]);
    }
}
