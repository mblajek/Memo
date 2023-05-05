<?php

namespace App\Exceptions;

use Exception;

class ApiException extends Exception
{
    use ApiExceptionTrait;

    public function __construct(int $httpCode, string $errorCode, ?array $errorData = null)
    {
        $this->errorCode = $errorCode;
        $this->errorData = $errorData;
        $this->httpCode = $httpCode;
        parent::__construct($this->getJson());
    }
}
