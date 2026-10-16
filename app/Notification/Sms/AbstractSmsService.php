<?php

namespace App\Notification\Sms;

use Illuminate\Http\Client\HttpClientException;
use Illuminate\Support\Facades\Config;

abstract readonly class AbstractSmsService
{
    protected const string CONFIG_FROM_NAME = 'services.sms.from_name';

    protected static function fromName(): ?string
    {
        return (Config::get(static::CONFIG_FROM_NAME) ?? Config::get(self::CONFIG_FROM_NAME)) ?: null;
    }

    /** @throws HttpClientException */
    abstract public function sendPreparedSms(string $number, string $message): void;
}
