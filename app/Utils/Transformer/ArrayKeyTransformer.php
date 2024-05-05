<?php

declare(strict_types=1);

namespace App\Utils\Transformer;

use Illuminate\Support\Str;

class ArrayKeyTransformer
{
    public static function toSnake(array $data): array
    {
        return array_combine(
            array_map(Str::snake(...), array_keys($data)),
            array_map(fn($value) => is_array($value) ? self::toSnake($value) : $value, $data),
        );
    }

    public static function toCamel(array $data): array
    {
        return array_combine(
            array_map(Str::camel(...), array_keys($data)),
            array_map(fn($value) => is_array($value) ? self::toCamel($value) : $value, $data),
        );
    }

    public static function hasSnake(array $data): bool
    {
        foreach ($data as $key => $value) {
            if ((is_string($key) && str_contains($key, '_')) || (is_array($value) && static::hasSnake($value))) {
                return true;
            }
        }
        return false;
    }
}
