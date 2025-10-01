<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

interface ApiExceptionInterface extends HttpExceptionInterface
{
    public function render(): JsonResponse;

    public string $errorCode {
        get;
    }
}
