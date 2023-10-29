<?php

namespace App\Services\System;

use Illuminate\Http\Request;

class MergePatchService
{
    public function merge($original, $patch)
    {
        if (!is_array($original) || array_is_list($original) ||
            !is_array($patch) || array_is_list($patch)) {
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
