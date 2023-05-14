<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /** @throws ApiValidationException */
    protected function unauthenticated($request, array $guards)
    {
        throw ExceptionFactory::unauthorised();
    }
}
