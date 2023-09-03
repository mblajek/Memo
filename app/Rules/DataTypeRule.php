<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Validation\Validator;

readonly class DataTypeRule implements ValidationRule, ValidatorAwareRule
{
    private Validator $validator;

    public function __construct(
        public string $type,
    ) {
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        preg_match('/^(\\??)(\\w*)$/', $this->type, $matches);
        [1 => $nullable, 2 => $type] = $matches;
        if (($nullable && $value === null) || gettype($attribute) === $type) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.data_type', ['type' => $this->type]);
    }

    public function setValidator(Validator $validator): void
    {
        $this->validator = $validator;
    }
}
