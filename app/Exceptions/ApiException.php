<?php

namespace App\Exceptions;

use Exception;

class ApiException extends Exception
{
    use ApiExceptionTrait;

    /** @throws static */
    public function throw()
    {
        throw $this;
    }

    public function __construct(int $httpCode, string $errorCode, array $errorData = [])
    {
        $this->errorCode = $errorCode;
        $this->errorData = $errorData;
        $this->httpCode = $httpCode;
        parent::__construct($this->getJson());
    }
}
