<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Validation\Validator;

final class ArrayIsListRule implements ValidationRule, ValidatorAwareRule
{
    private Validator $validator;

    public function __construct()
    {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_array($value) && array_is_list($value)) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.data_type', ['type' => 'list']);
    }

    public function setValidator(Validator $validator): void
    {
        $this->validator = $validator;
    }
}
