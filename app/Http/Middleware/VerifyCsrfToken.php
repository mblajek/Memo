<?php

namespace App\Http\Middleware;

use App\Exceptions\ExceptionFactory;
use Closure;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpFoundation\Response;

class VerifyCsrfToken extends Middleware
{
    public const string HEADER_REQUEST = 'X-CSRF-TOKEN';
    public const string HEADER_RESPONSE = 'X-SET-CSRF-TOKEN';

    // Send the token using a header instead of a cookie.
    protected $addHttpCookie = false;
    private static string $token;


    public static function getToken(): string
    {
        return self::$token;
    }

    /**
     * @param Request $request
     * @throws TokenMismatchException
     */
    public function handle($request, Closure $next): Response
    {
        self::$token = $this->encrypter->encrypt($request->session()->token(), false);
        try {
            $response = parent::handle($request, $next);
        } catch (TokenMismatchException) {
            ExceptionFactory::csrfTokenMismatch()->throw();
        }
        $this->addHeaderToResponse($response);
        return $response;
    }

    protected function addHeaderToResponse(Response $response): void
    {
        $response->headers->set(self::HEADER_RESPONSE, self::getToken());
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
