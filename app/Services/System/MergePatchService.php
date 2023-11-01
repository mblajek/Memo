<?php

namespace App\Services\System;

class MergePatchService
{
    /*
     * Rules:
     *  object: an array with at least one non-numeric key
     *  value: any primitive or any array with only numeric keys
     *  []: special case because we can't determine if it's an object or an array
     *
     *  ORIGINAL    PATCH       RESULT
     *  object      object      recursive merge
     *  object      value       $patch
     *  object      []          $original
     *  value       object      $patch
     *  value       value       $patch
     *  value       []          []
     *  []          object      $patch
     *  []          value       $patch
     *  []          []          []
     */
    public function merge($original, $patch)
    {
        $isValue = fn ($any) => !is_array($any) || (array_is_list($any) && !empty($any));
        if ($isValue($original) || $original === [] || $isValue($patch)) {
            return $patch;
        }

        foreach ($patch as $key => $value) {
            if (isset($original[$key])) {
                $original[$key] = $this->merge($original[$key], $value);
            } else {
                $original[$key] = $value;
            }
        }

        return $original;
    }
}
