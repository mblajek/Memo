<?php

namespace App\Utils;

class ConditionalArrayRule
{
    private function __construct()
    {
    }

    public static function is_conditional_array(array $array): bool
    {
        return count($array) && is_bool($array[0]);
    }

    public static function process_conditional_array(array $array): array
    {
        if (count($array) && is_bool($array[0])) {
            if ($array[0]) {
                return array_slice($array, 1);
            }
            return [];
        }
        return $array;
    }
}
