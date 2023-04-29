<?php

namespace App\Exceptions;

use Exception;

class ApiException extends Exception
{
    use ApiExceptionTrait;

    public function __construct(string $errorCode, ?array $errorData = null)
    {
        parent::__construct($this->getJson());
        $this->errorCode = $errorCode;
        $this->errorData = $errorData;
    }
}
