<?php

namespace App\Exceptions;

use Throwable;

class FatalExceptionFactory
{
    public static function fatal(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.fatal');
    }

    public static function unknown(Throwable $e): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.unknown', ['class' => $e::class]);
    }

    public static function internal(): ApiFatalException
    {
        return new ApiFatalException('exception.http.internal_server_error');
    }

    public static function translations(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.translation');
    }

    public static function unexpected(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.unexpected');
    }

    public static function tquery(array $errorData = []): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.tquery', $errorData);
    }
}
