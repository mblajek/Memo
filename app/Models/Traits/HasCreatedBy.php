<?php

namespace App\Models\Traits;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string created_by
 * @property User createdBy
 * @mixin Model
 */
trait HasCreatedBy
{
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'created_by');
    }
}
