<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

readonly class PresentWith implements ValidationRule
{
    public function __construct(private string $referredField)
    {
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== null && request()?->input($this->referredField) === null) {
            $fail("The :attribute must be present with $this->referredField.");
        }
    }
}
