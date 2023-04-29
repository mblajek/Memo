<?php

namespace App\Exceptions;

use RuntimeException;

class ApiFatalException extends RuntimeException
{
    use ApiExceptionTrait;

    public function __construct(string $errorCode, ?array $errorData = null)
    {
        parent::__construct($this->getJson());
        $this->errorCode = $errorCode;
        $this->errorData = $errorData;
    }
}
