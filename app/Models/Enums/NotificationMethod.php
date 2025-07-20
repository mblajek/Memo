<?php

namespace App\Models\Enums;

use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Notification\AbstractNotificationSendService;
use App\Notification\Sms\SmsService;

enum NotificationMethod: string implements PositionsEnum
{
    public static function dictEnum(): DictionaryUuidEnum
    {
        return DictionaryUuidEnum::NotificationMethod;
    }

    case Sms = '35a4c273-44b8-4039-a79f-391213973f58';

    /** @return class-string<AbstractNotificationSendService> */
    public function service(): string
    {
        return match ($this) {
            self::Sms => SmsService::class,
        };
    }
}
