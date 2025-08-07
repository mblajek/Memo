<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use Closure;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Session\Session;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpFoundation\Response;

class VerifyCsrfToken extends Middleware
{
    public const string HEADER_REQUEST = 'X-CSRF-TOKEN';
    public const string HEADER_RESPONSE = 'X-SET-CSRF-TOKEN';

    // Send the token using a header instead of a cookie.
    protected $addHttpCookie = false;
    private static string $token;

    private function getToken(Session $session): string
    {
        return self::$token ??= $this->encrypter->encrypt($session->token(), false);
    }

    /**
     * @param Request $request
     * @throws ApiException
     */
    public function handle($request, Closure $next, string ...$permissions): Response
    {
        try {
            $response = parent::handle($request, $next);
        } catch (TokenMismatchException) {
            ExceptionFactory::csrfTokenMismatch()->throw();
        }

        $response->headers->set(self::HEADER_RESPONSE, self::getToken($request->session()));

        return $response;
    }

    /**
     * @param Request $request
     */
    protected function isReading($request): bool
    {
        if (parent::isReading($request)) {
            return true;
        }
        /** @var Route $route */
        $route = $request->getRouteResolver()();
        if ($request->method() === 'POST' && str_ends_with($route->uri(), '/tquery')) {
            return true;
        }
        return false;
    }

    protected function getTokenFromRequest($request): ?string
    {
        $token = $request->header(self::HEADER_REQUEST);
        if ($token && is_string($token)) {
            try {
                return $this->encrypter->decrypt($token, false);
            } catch (DecryptException) {
            }
        }
        return null;
    }
}
