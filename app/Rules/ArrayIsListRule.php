<?php

namespace App\Rules;

use Closure;

final class ArrayIsListRule extends AbstractRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_array($value) && array_is_list($value)) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.data_type', ['type' => 'list']);
    }
}
