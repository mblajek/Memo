<?php

namespace App\Models;

use App\Models\QueryBuilders\MeetingBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasCreatedBy;
use App\Models\Traits\HasValidator;
use App\Models\Traits\HasUuid;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Rules\Valid;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;

/**
 * @property string facility_id
 * @property string category_dict_id
 * @property string type_dict_id
 * @property string notes
 * @property string date
 * @property int start_dayminute
 * @property int duration_minutes
 * @property string status_dict_id
 * @property-read Collection|MeetingAttendant[] $attendants
 * @property-read Collection|MeetingResource[] $resources
 * @method static MeetingBuilder query()
 */
class Meeting extends Model
{
    use HasValidator;
    use BaseModel;
    use HasCreatedBy;

    protected $table = 'meetings';

    protected $fillable = [
        'facility_id',
        'category_dict_id',
        'type_dict_id',
        'date',
        'notes',
        'start_dayminute',
        'duration_minutes',
        'status_dict_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'facility_id' => Valid::uuid([Rule::exists('facilities')]),
            'type_dict_id' => Valid::dict(DictionaryUuidEnum::meetingType),
            'date' => Valid::date(),
            'notes' => Valid::trimmed(max: 4000),
            'start_dayminute' => Valid::int(['min:' . (2 * 60), 'max:' . (24 * 60)]),
            'duration_minutes' => Valid::int(['min:' . (5), 'max:' . (24 * 60)]),
            'status_dict_id' => Valid::dict(DictionaryUuidEnum::meetingStatus),
        };
    }

    public function attendants(): HasMany
    {
        return $this->hasMany(MeetingAttendant::class);
    }

    public function resources(): HasMany
    {
        return $this->hasMany(MeetingResource::class);
    }
}
