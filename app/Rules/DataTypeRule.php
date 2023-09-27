<?php

namespace App\Rules;

use Closure;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\ValidatorAwareRule;
use Illuminate\Validation\Validator;

final class DataTypeRule extends AbstractRule
{
    public static function bool(bool $nullable = false): self
    {
        return new self('bool', $nullable);
    }

    public static function int(bool $nullable = false): self
    {
        return new self('int', $nullable);
    }

    private function __construct(
        private readonly string $type,
        private readonly bool $nullable,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (($this->nullable && $value === null) || get_debug_type($value) === $this->type) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.data_type', [
            'type' => ($this->nullable ? '?' : '') . $this->type,
        ]);
    }
}
