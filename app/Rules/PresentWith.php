<?php

namespace App\Rules;

use Closure;

use Illuminate\Support\Arr;

/** Rule for a field which is required when another field is present */
final class PresentWith extends AbstractDataRule
{
    public function __construct(
        private readonly string $other,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (Arr::has($this->data, $attribute) == Arr::has($this->data, $this->other)) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.present_with', ['other' => $this->other]);
    }
}
