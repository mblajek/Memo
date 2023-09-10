<?php

namespace App\Exceptions;

class FatalExceptionFactory
{
    public static function translations(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.translation');
    }

    public static function unexpected(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.unexpected');
    }

    public static function tquery(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.tquery');
    }
}
