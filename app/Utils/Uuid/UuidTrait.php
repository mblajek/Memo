<?php

namespace App\Utils\Uuid;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

trait UuidTrait
{
    use HasUuids;

    /** Random uuid instead of ordered */
    public function newUniqueId(): string
    {
        return Str::uuid()->toString();
    }
}
