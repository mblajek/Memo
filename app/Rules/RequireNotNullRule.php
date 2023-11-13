<?php

namespace App\Rules;

use Closure;

use Illuminate\Support\Arr;

final class RequireNotNullRule extends AbstractDataRule
{
    public function __construct(
        private readonly string $referredField,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null ||
            (Arr::has($this->data, $this->referredField) && $this->data[$this->referredField] !== null)) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.require_not_null', ['other' => $this->referredField]);
    }
}
