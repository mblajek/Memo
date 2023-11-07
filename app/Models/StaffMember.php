<?php

namespace App\Models;

use App\Models\QueryBuilders\StaffMemberBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Timetable $timetable
 * @property-read Member $member
 * @method static StaffMemberBuilder query()
 */
class StaffMember extends Model
{
    use HasFactory;
    use UuidTrait;

    protected $table = 'staff_members';

    protected $fillable = [
        'timetable_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
