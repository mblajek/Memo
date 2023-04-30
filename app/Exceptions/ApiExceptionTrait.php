<?php

namespace App\Exceptions;

trait ApiExceptionTrait
{
    public readonly string $errorCode;
    public readonly ?array $errorData;

    abstract public function __construct(string $errorCode, ?array $errorData = null);

    public function getJson(): string
    {
        return json_encode(array_filter(['code' => $this->errorCode, 'data' => $this->errorData]));
    }
}
