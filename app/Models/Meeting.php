<?php

namespace App\Models;

use App\Models\Enums\AttendanceType;
use App\Models\QueryBuilders\MeetingBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasDeletedBy;
use App\Models\Traits\HasValidator;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Rules\MemberExistsRule;
use App\Rules\UniqueWithMemoryRule;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
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
 * @property ?string from_meeting_id
 * @property ?string interval
 * @property-read Collection|MeetingAttendant[] $attendants
 * @property-read Collection|MeetingResource[] $resources
 * @method static MeetingBuilder query()
 */
class Meeting extends Model
{
    use HasValidator;
    use BaseModel;
    use HasDeletedBy;
    use SoftDeletes;

    public const string STATUS_COMPLETED = 'f6001030-c061-480e-9a5a-7013cee7ff40';
    public const string STATUS_PLANNED = '86aaead1-bbcc-4af1-a74a-ed2bdff46d0a';
    public const string CATEGORY_SYSTEM = '2903ea34-6188-4972-b84c-d3dc4047ee3c';

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
        'is_remote',
        'from_meeting_id',
        'interval',
    ];

    protected $casts = [
        'date' => 'string',
        'is_remote' => 'boolean',
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')]),
            'type_dict_id' => Valid::dict(DictionaryUuidEnum::MeetingType),
            'date' => Valid::date(),
            'notes' => Valid::trimmed(sometimes: true, nullable: true, max: 4000),
            'start_dayminute' => Valid::int(['min:' . (0), 'max:' . (24 * 60 - 1)]),
            'duration_minutes' => Valid::int(['min:' . (5), 'max:' . (24 * 60)]),
            'status_dict_id' => Valid::dict(DictionaryUuidEnum::MeetingStatus),
            'is_remote' => Valid::bool(),
            'staff', 'clients', 'resources' => Valid::list(sometimes: true, min: 0),
            'staff.*', 'clients.*' => Valid::array(keys: ['user_id', 'attendance_status_dict_id']),
            'staff.*.attendance_status_dict_id', 'clients.*.attendance_status_dict_id' =>
            Valid::dict(DictionaryUuidEnum::AttendanceStatus),
            'staff.*.user_id' => Valid::uuid([
                new UniqueWithMemoryRule('attendant'),
                new MemberExistsRule(AttendanceType::Staff),
            ]),
            'clients.*.user_id' => Valid::uuid([
                new UniqueWithMemoryRule('attendant'),
                new MemberExistsRule(AttendanceType::Client),
            ]),
            'resources.*' => Valid::array(keys: ['resource_dict_id']),
            'resources.*.resource_dict_id' => Valid::dict(
                DictionaryUuidEnum::MeetingResource,
                [new UniqueWithMemoryRule('resource')],
            ),
        };
    }

    public function attendants(): HasMany
    {
        return $this->hasMany(MeetingAttendant::class);
    }

    /** @return Collection<MeetingAttendant> */
    public function getAttendants(AttendanceType $attendanceType): Collection
    {
        return $this->attendants->filter(
            fn(MeetingAttendant $attendant) => $attendant->attendance_type_dict_id === $attendanceType->value,
        );
    }

    public function resources(): HasMany
    {
        return $this->hasMany(MeetingResource::class);
    }

    public function resetStatus(): void
    {
        $this->status_dict_id = self::STATUS_PLANNED;
    }
}
