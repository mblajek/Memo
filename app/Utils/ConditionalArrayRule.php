<?php

namespace App\Utils;

class ConditionalArrayRule
{
    private function __construct()
    {
    }

    public static function isConditionalArray(mixed $array): bool
    {
        return is_array($array) && count($array) && is_bool($array[0]);
    }

    public static function processIfConditionalArray(mixed $array): mixed
    {

        if (self::isConditionalArray($array)) {
            /** @var array $array */
            return $array[0] ? array_slice($array, 1) : [];
        }
        return $array;
    }
}
