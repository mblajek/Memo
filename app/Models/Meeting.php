<?php

namespace App\Models;

use App\Models\QueryBuilders\MeetingBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string id
 * @property string facility_id
 * @property string category_dict_id
 * @property string type_dict_id
 * @property string name
 * @property string notes
 * @property string date
 * @property int start_dayminute
 * @property int duration_minutes
 * @property string status_dict_id
 * @property string created_by
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Collection|MeetingAttendant[] $attendants
 * @property-read Collection|MeetingResource[] $resources
 * @method static MeetingBuilder query()
 */
class Meeting extends Model
{
    use UuidTrait;

    protected $table = 'meetings';

    protected $fillable = [
        'facility_id',
        'category_dict_id',
        'type_dict_id',
        'name',
        'date',
        'notes',
        'start_dayminute',
        'duration_minutes',
        'status_dict_id',
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function attendants(): HasMany
    {
        return $this->hasMany(MeetingAttendant::class);
    }

    public function resources(): HasMany
    {
        return $this->hasMany(MeetingResource::class);
    }
}
