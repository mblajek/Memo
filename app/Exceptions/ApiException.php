<?php

namespace App\Exceptions;

use Exception;

class ApiException extends Exception
{
    use ApiExceptionTrait;

    public function __construct(
        public readonly string $errorCode,
        public readonly ?array $errorData = null
    ) {
        parent::__construct($this->getJson());
    }
}
