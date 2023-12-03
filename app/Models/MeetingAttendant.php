<?php

namespace App\Models;

use App\Models\Enums\AttendanceType;
use App\Models\QueryBuilders\MeetingAttendantBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * @property string meeting_id
 * @property string user_id
 * @property AttendanceType attendance_type
 * @property ?string attendance_status_dict_id
 * @method static MeetingAttendantBuilder query()
 */
class MeetingAttendant extends Model
{
    use BaseModel;
    use HasValidator;

    protected $table = 'meeting_attendants';

    protected $fillable = [
        'meeting_id',
        'user_id',
        'attendance_type',
        'attendance_status_dict_id',
    ];

    protected $casts = [
        'attendance_type' => AttendanceType::class,
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'meeting_id' => Valid::uuid([Rule::exists('meetings')]),
            'user_id' => Valid::uuid([Rule::exists('users', 'id')]),
            'attendance_type' =>
            Valid::trimmed([Rule::in(array_map(fn(AttendanceType $case) => $case->value, AttendanceType::cases()))]),
            'attendance_status_dict_id' => Valid::dict(DictionaryUuidEnum::attendanceStatus, nullable: true),
        };
    }
}
