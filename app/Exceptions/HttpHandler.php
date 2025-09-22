<?php

namespace App\Exceptions;

use Closure;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\App;
use Illuminate\Validation\ValidationException;
use Psr\Log\LogLevel;
use Symfony\Component\ErrorHandler\Error\FatalError;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Throwable;

class HttpHandler extends ExceptionHandler
{
    private array $fatalErrorHandlers = [];

    /**
     * A list of exception types with their corresponding custom log levels.
     *
     * @var array<class-string<Throwable>, LogLevel::*>
     */
    protected $levels = [
        ApiFatalException::class => LogLevel::CRITICAL,
    ];

    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        ApiException::class,
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

    public function registerFatalErrorHandler(Closure $handler): void
    {
        $this->fatalErrorHandlers[] = $handler;
    }

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->shouldRenderJsonWhen(function (Request $request) {
            /** @var ?Route $route */
            $route = $request->route();
            return $route && str_starts_with($route->uri(), 'api/');
        });

        $this->reportable(function (FatalError $e) {
            foreach ($this->fatalErrorHandlers as $fatalErrorHandler) {
                $fatalErrorHandler($e);
            }
        });
    }

    /** @inheritdoc */
    protected function prepareException(Throwable $e): Throwable
    {
        $e = parent::prepareException($e);

        return match (true) {
            App::hasDebugModeEnabled(), ($e instanceof ValidationException) => $e,
            ($e instanceof TooManyRequestsHttpException) => ExceptionFactory::tooManyRequests(),
            ($e instanceof NotFoundHttpException) => ExceptionFactory::notFound(),
            ($e instanceof UnauthorizedHttpException) => ExceptionFactory::unauthorised(),
            ($e instanceof AccessDeniedHttpException) => ExceptionFactory::forbidden(),
            ($e instanceof BadRequestHttpException) => ExceptionFactory::validation(),
            ($e instanceof HttpExceptionInterface) => match ($e->getStatusCode()) {
                500 => FatalExceptionFactory::internal(),
                default => ExceptionFactory::unknownHttp($e->getStatusCode()),
            },
            ($e instanceof FatalError) => FatalExceptionFactory::fatal(),
            true => FatalExceptionFactory::unknown($e),
        };
    }

    /** @inheritdoc */
    protected function prepareJsonResponse($request, Throwable $e): JsonResponse
    {
        return ($e instanceof ApiExceptionInterface) ? $e->render()
            : parent::prepareJsonResponse($request, $e);
    }

    /** @inheritdoc */
    protected function invalidJson($request, ValidationException $exception): JsonResponse
    {
        return (new ValidationExceptionRenderer($exception))->render();
    }
}
