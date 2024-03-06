<?php

namespace App\Models\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string updated_by
 * @property User updatedBy
 * @mixin Model
 */
trait HasUpdatedBy
{
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'updated_by');
    }
}
