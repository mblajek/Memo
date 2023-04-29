<?php

namespace App\Exceptions;

trait ApiExceptionTrait
{
    public function getJson(): string
    {
        return json_encode(array_filter(['code' => $this->errorCode, 'data' => $this->errorData]));
    }
}
