<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    // Send the token using a header instead of a cookie.
    protected $addHttpCookie = false;

    public function handle($request, Closure $next)
    {
        $response = parent::handle($request, $next);
        $this->addHeaderToResponse($request, $response);
        return $response;
    }

    protected function addHeaderToResponse($request, $response)
    {
        if ($response instanceof Responsable) {
            $response = $response->toResponse($request);
        }
        $response->headers->set('X-SET-CSRF-TOKEN', csrf_token());
    }

    protected function getTokenFromRequest($request)
    {
        return $request->header('X-CSRF-TOKEN');
    }

}
