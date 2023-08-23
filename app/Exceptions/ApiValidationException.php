<?php

namespace App\Exceptions;

class ApiValidationException extends ApiException
{
    use ApiExceptionTrait;

    public function addValidation(string $field, string $rule, array $data = []): void
    {
        $this->validationErrors[] = array_filter(['field' => $field, 'code' => "validation.$rule", 'data' => $data]);
    }
}
