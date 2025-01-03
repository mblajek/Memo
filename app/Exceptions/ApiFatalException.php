<?php

namespace App\Exceptions;

use RuntimeException;

class ApiFatalException extends RuntimeException
{
    use ApiExceptionTrait;

    /** @throws static */
    public function throw(): never
    {
        throw $this;
    }

    public function __construct(string $errorCode, array $errorData = [])
    {
        $this->errorCode = $errorCode;
        $this->errorData = $errorData;
        $this->httpCode = 500;
        parent::__construct($this->getJson());
    }
}
