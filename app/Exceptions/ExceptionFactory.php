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

    public static function badCredentials(): ApiException
    {
        return new ApiException(401, 'exception.bad_credentials');
    }

    public static function forbidden(): ApiException
    {
        return new ApiException(403, 'exception.forbidden');
    }

    public static function notFound(): ApiException
    {
        return new ApiException(404, 'exception.not_found');
    }

    public static function routeNotFound(): ApiException
    {
        return new ApiException(404, 'exception.route_not_found');
    }

    public static function badRequestUrl(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.bad_request_uuid');
    }

    public static function snakeCaseRequest(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.snake_case_request');
    }

    public static function invalidJson(): ApiValidationException
    {
        return new ApiValidationException(400, 'exception.invalid_json');
    }

    public static function tooManyRequests(): ApiException
    {
        return new ApiException(429, 'exception.too_many_requests');
    }

    public static function csrfTokenMismatch(): ApiException
    {
        return new ApiException(419, 'exception.csrf_token_mismatch');
    }

    public static function userNotManagedByFacility(): ApiException
    {
        return new ApiException(409, 'exception.user_not_managed_by_facility');
    }

    public static function smsInvalidNumberFormat(string $phoneNumber): ApiException
    {
        return new ApiException(
            400,
            'exception.notification.sms.invalid_number_format',
            ['phoneNumber' => $phoneNumber],
        );
    }

    public static function smsMessageTooLong(int $max, int $length): ApiException
    {
        return new ApiException(
            400,
            'exception.notification.sms.message_too_long',
            ['max' => $max, 'length' => $length],
        );
    }
}
