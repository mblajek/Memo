<?php

declare(strict_types=1);

namespace App\Utils\Transformer;

use ValueError;

class StringTransformer
{
    static array $camelCache = [];
    static array $snakeCache = [];

    public static function snake(string $value): string
    {
        return self::$camelCache[$value] ??= preg_match('/^((?:__)?[a-z0-9]+)([a-z0-9A-Z]*)$/', $value, $match)
            ? (($match[2] === '') ? $value : ($match[1] . strtolower(preg_replace('/([A-Z])/', '_$1', $match[2]))))
            : (throw new ValueError($value));
    }

    public static function camel(string $value): string
    {
        return self::$snakeCache[$value] ??= preg_match('/^((?:__)?[a-z0-9]+)((?:_[a-z][a-z0-9]+)*)$/', $value, $match)
            ? (($match[2] === '') ? $value : ($match[1] . str_replace('_', '', ucwords($match[2], '_'))))
            : (throw new ValueError($value));
    }

    public static function snakeKeys(mixed $data): mixed
    {
        return (!is_array($data)) ? $data : (array_is_list($data) ? array_map(self::snakeKeys(...), $data)
            : array_combine(array_map(self::snake(...), array_keys($data)), array_map(self::snakeKeys(...), $data)));
    }

    public static function camelKeys(mixed $data): mixed
    {
        return (!is_array($data)) ? $data : (array_is_list($data) ? array_map(self::camelKeys(...), $data)
            : array_combine(array_map(self::camel(...), array_keys($data)), array_map(self::camelKeys(...), $data)));
    }
}
