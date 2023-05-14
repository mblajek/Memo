<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Psr\Log\LogLevel;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of exception types with their corresponding custom log levels.
     *
     * @var array<class-string<Throwable>, LogLevel::*>
     */
    protected $levels = [
        ApiFatalException::class => LogLevel::CRITICAL
        //
    ];

    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        ApiException::class
        //
    ];

    /**
     * A list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
        $this->renderable(function (ValidationException|HttpExceptionInterface $e): ?JsonResponse {
            if ($e instanceof NotFoundHttpException) {
                return ExceptionFactory::notFound()->render();
            }
            if ($e instanceof UnauthorizedHttpException) {
                return ExceptionFactory::unauthorised()->render();
            }
            if ($e instanceof AccessDeniedHttpException) {
                return ExceptionFactory::forbidden()->render();
            }
            if ($e instanceof BadRequestHttpException) {
                return ExceptionFactory::validation()->render();
            }
            if ($e instanceof ValidationException) {
                return (new ValidationExceptionRenderer($e))->render();
            }
            return null;
        });
    }
}
