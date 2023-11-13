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
