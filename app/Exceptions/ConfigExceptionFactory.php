<?php

namespace App\Exceptions;

class ConfigExceptionFactory
{
    public static function translations(): ApiFatalException
    {
        return new ApiFatalException('exception.configuration.translations');
    }
}
