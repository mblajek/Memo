<?php

declare(strict_types=1);

namespace App\Utils\Transformer;

use Illuminate\Support\Str;

class ArrayKeyTransformer
{
    public static function toSnake(array $data): array
    {
        $keys = array_map(static fn($key) => Str::snake($key), array_keys($data));

        $data = array_map(static fn($value) => is_array($value) ? static::toSnake($value) : $value, $data);

        return array_combine($keys, array_values($data));
    }

    public static function hasSnake(array $data): bool
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && str_contains($key, '_')) {
                return true;
            }

            if (is_array($value) && static::hasSnake($value)) {
                return true;
            }
        }

        return false;
    }
}
