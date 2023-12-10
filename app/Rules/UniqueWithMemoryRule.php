<?php

namespace App\Rules;

use Closure;

final class UniqueWithMemoryRule extends AbstractRule
{
    private static array $values = [];

    public function __construct(
        private readonly string $key,
    ) {
    }

    public static function reset(): void
    {
        self::$values = [];
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!array_key_exists($this->key, self::$values) || !in_array($value, self::$values[$this->key], true)) {
            self::$values[$this->key][] = $value;
            return;
        }
        $this->validator->addFailure($attribute, 'custom.unique_items');
    }
}
