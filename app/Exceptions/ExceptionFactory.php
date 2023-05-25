<?php

namespace App\Exceptions;

class ExceptionFactory
{
    public static function validation(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.validation');
    }

    public static function unauthorised(): ApiException
    {
        return new ApiException(401, 'exception.unauthorised');
    }

    public static function forbidden(): ApiException
    {
        return new ApiException(403, 'exception.forbidden');
    }

    public static function notFound(): ApiException
    {
        return new ApiException(404, 'exception.not_found');
    }

    public static function badRequestUrl(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.bad_request_uuid');
    }
}
