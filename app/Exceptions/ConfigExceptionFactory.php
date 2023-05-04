<?php

namespace App\Exceptions;

class ConfigExceptionFactory
{
    public static function translations(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.translation');
    }

    public static function reflectionRules(): ApiFatalException
    {
        return new ApiFatalException('exception.reflection.rules');
    }
}
