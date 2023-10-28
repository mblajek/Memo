<?php

namespace App\Services\System;

use Illuminate\Http\Request;

class MergePatchService
{
    public function mergeInto(object $object, array $patchData): void
    {
        $this->mergeImpl($object, $patchData);
    }

    private function mergeImpl($original, $patch) {
        if (!is_object($original) || array_is_list($patch)) {
            return $patch;
        }

        foreach ($patch as $field => $value) {
            if (isset($original->$field)) {
                $original->$field = $this->mergeImpl($original->$field, $value);
            } else {
                $original->$field = $value;
            }
        }

        return $original;
    }
}
