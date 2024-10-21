<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\PotentiallyMissing;

class Missing implements PotentiallyMissing
{
    private static self $missing;

    public static function get(): self
    {
        return self::$missing ?? (self::$missing = new self());
    }

    public function isMissing(): true
    {
        return true;
    }
}
