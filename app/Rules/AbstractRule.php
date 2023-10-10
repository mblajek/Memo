<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;

use Illuminate\Validation\Validator;

abstract class AbstractRule implements ValidationRule, ValidatorAwareRule
{
    protected Validator $validator;

    public function setValidator(Validator $validator): void
    {
        $this->validator = $validator;
    }
}
