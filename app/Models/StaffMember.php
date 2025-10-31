<?php

namespace App\Models;

use App\Models\Traits\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string $deactivated_at
 * @property-read Member $member
 * @method static Builder<self> query()
 */
class StaffMember extends Model
{
    use BaseModel;

    protected $table = 'staff_members';

    protected $fillable = [
        'deactivated_at',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'deactivated_at' => 'immutable_datetime',
    ];

    public function isActive(): bool
    {
        return ($this->deactivated_at === null);
    }

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
