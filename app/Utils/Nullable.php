<?php

namespace App\Utils;

class Nullable
{
    public static function call(mixed $value, callable $callable): mixed
    {
        return ($value !== null) ? $callable($value) : null;
    }

    /**
     * @template TValue
     * @param TValue $first
     * @param TValue $other
     */
    public static function equals(mixed $first, mixed $other): bool
    {
        return ($first === null) ? ($other === null) : ($other && $first->equals($other));
    }
}
