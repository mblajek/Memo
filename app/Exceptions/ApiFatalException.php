<?php

namespace App\Exceptions;

use RuntimeException;

class ApiFatalException extends RuntimeException
{
    use ApiExceptionTrait;

    public function __construct(
        public readonly string $errorCode,
        public readonly ?array $errorData = null
    ) {
        parent::__construct($this->getJson());
    }
}
