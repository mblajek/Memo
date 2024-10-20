<?php

namespace App\Exceptions;

use Throwable;

class ConsoleHandler extends HttpHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [ /* report all */ ];
}
