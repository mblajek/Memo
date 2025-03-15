<?php

namespace App\Http\Middleware;

use Closure;
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
        $response->headers->set(
            'X-SET-CSRF-TOKEN',
            $this->encrypter->encrypt($request->session()->token(), false));
    }

    protected function getTokenFromRequest($request)
    {
        $header = $request->header('X-CSRF-TOKEN');
        if ($header && is_string($header)) {
            return $this->encrypter->decrypt($header, false);
        }
        return '';
    }

}
