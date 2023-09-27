<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Validation\Validator;

final class StringIsTrimmedRule extends AbstractRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && trim($value, " \n\r\t") === $value) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.trimmed');
    }
}
