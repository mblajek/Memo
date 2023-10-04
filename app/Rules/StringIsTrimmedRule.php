<?php

namespace App\Rules;

use Closure;

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
