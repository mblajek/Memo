<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Support\Arr;
use Illuminate\Validation\Validator;

final class RequirePresentRule extends AbstractDataRule
{
    public function __construct(
        private readonly string $referredField,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || Arr::has($this->data, $this->referredField)) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.require_present', ['other' => $this->referredField]);
    }
}
