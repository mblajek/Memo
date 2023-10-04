<?php

namespace App\Rules;

use Closure;

use Illuminate\Support\Arr;

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
