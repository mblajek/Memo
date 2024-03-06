<?php

namespace App\Models\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string deleted_by
 * @property User deletedBy
 * @mixin Model
 */
trait HasDeletedBy
{
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'deleted_by');
    }
}
