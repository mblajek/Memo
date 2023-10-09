<?php

namespace App\Rules;

use Closure;

final class DataTypeRule extends AbstractRule
{
    public static function bool(): self
    {
        return new self('bool');
    }

    public static function int(): self
    {
        return new self('int');
    }

    private function __construct(
        private readonly string $type,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (get_debug_type($value) === $this->type) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.data_type', [$this->type]);
    }
}
