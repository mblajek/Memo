<?php

namespace App\Rules;

use App\Rules\AbstractDataRule;
use Closure;
use Illuminate\Support\Arr;

final class RequirePresentWhenEquals extends AbstractDataRule
{
    public function __construct(
        private readonly mixed $whenValue,
        private readonly string $referredField,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== $this->whenValue || Arr::has($this->data, $this->referredField)) {
            return;
        }
        $this->validator->addFailure(
            $attribute,
            'custom.require_present_when_equals',
            ['whenValue' => $this->whenValue, 'other' => $this->referredField]
        );
    }
}
