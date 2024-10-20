<?php

namespace App\Notification\Sms;

use Illuminate\Http\Client\HttpClientException;
use Illuminate\Support\Env;

abstract readonly class AbstractSmsService
{
    protected const string ENV_FROM_NAME = 'SMS_FROM_NAME';

    protected static function fromName(): ?string
    {
        return Env::get(static::ENV_FROM_NAME, Env::get(self::ENV_FROM_NAME)) ?: null;
    }

    /** @throws HttpClientException */
    abstract public function sendPreparedSms(string $number, string $message): void;
}
