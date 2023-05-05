<?php

namespace App\Exceptions;

class ExceptionFactory
{
    public static function validation(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.validation');
    }

    public static function unauthorised(): ApiValidationException
    {
        return new ApiValidationException(401, 'exception.unauthorised');
    }

    public static function notFound(): ApiValidationException
    {
        return new ApiValidationException(404, 'exception.not_found');
    }
}
