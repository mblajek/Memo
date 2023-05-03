<?php

namespace App\Exceptions;

class ExceptionFactory
{
    public static function validation(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.validation');
    }
}
