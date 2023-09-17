<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Validation\Validator;

final class RequirePresentRule implements ValidationRule, DataAwareRule, ValidatorAwareRule
{
    private array $data;
    private Validator $validator;

    public function __construct(
        private readonly string $referredField,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== null && !array_key_exists($this->referredField, $this->data)) {
            $this->validator->addFailure($attribute, 'custom.require_present', ['other' => $this->referredField]);
        }
    }

    public function setData(array $data): void
    {
        $this->data = $data;
    }

    public function setValidator(Validator $validator): void
    {
        $this->validator = $validator;
    }
}
