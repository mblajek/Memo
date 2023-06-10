<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

class PresentWith implements ValidationRule, DataAwareRule
{
    protected array $data = [];

    public function __construct(private readonly string $referredField)
    {
    }

    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== null && $this->data[$this->referredField] === null) {
            $fail("The :attribute must be present with $this->referredField.");
        }
    }
}
