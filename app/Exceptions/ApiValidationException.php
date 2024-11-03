<?php

namespace App\Exceptions;

class ApiValidationException extends ApiException
{
    use ApiExceptionTrait;

    /** @throws static */
    public function throw(): never
    {
        throw $this;
    }

    public function addValidation(string $field, string $rule, array $data = []): void
    {
        $this->validationErrors[] = array_filter(['field' => $field, 'code' => "validation.$rule", 'data' => $data]);
    }
}
