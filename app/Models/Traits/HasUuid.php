<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

trait HasUuid
{
    use HasUuids;

    /** Random uuid instead of ordered */
    public function newUniqueId(): string
    {
        return Str::uuid()->toString();
    }
}
