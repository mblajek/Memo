<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpFoundation\Response;

class VerifyCsrfToken extends Middleware
{
    private const string HEADER_REQUEST = 'X-CSRF-TOKEN';
    private const string HEADER_RESPONSE = 'X-SET-CSRF-TOKEN';

    // Send the token using a header instead of a cookie.
    protected $addHttpCookie = false;

    /**
     * @param Request $request
     * @throws TokenMismatchException
     */
    public function handle($request, Closure $next): Response
    {
        $response = parent::handle($request, $next);
        $this->addHeaderToResponse($request, $response);
        return $response;
    }

    protected function addHeaderToResponse(Request $request, Response $response): void
    {
        $response->headers->set(
            self::HEADER_RESPONSE,
            $this->encrypter->encrypt($request->session()->token()),
        );
    }

    protected function getTokenFromRequest($request): ?string
    {
        $token = $request->header(self::HEADER_REQUEST);
        return is_string($token) ? $this->encrypter->decrypt($token) : null;
    }
}
