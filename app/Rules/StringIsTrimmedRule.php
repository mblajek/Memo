<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Validation\Validator;

final class StringIsTrimmedRule implements ValidationRule, ValidatorAwareRule
{
    private Validator $validator;

    public function __construct()
    {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && trim($value, " \n\r\t") === $value) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.trimmed');
    }

    public function setValidator(Validator $validator): void
    {
        $this->validator = $validator;
    }
}
