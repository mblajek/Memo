<?php

namespace App\Utils;

function array_flatten(array $array): array
{
    if (!array_is_list($array)) {
        return $array;
    }

    $flatArray = [];
    foreach ($array as $item) {
        if (is_array($item)) {
            $flatArray = array_merge($flatArray, array_flatten($item));
        } else {
            $flatArray [] = $item;
        }
    }
    return $flatArray;
}

function is_conditional_array(array $array): bool
{
    return count($array) && is_bool($array[0]);
}

function process_conditional_array(array $array): array
{
    if (count($array) && is_bool($array[0])) {
        if ($array[0]) {
            return array_slice($array, 1);
        }
        return [];
    }
    return $array;
}
