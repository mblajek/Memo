<?php

namespace App\Models;

use App\Models\Enums\AttendanceType;
use App\Models\QueryBuilders\MeetingAttendantBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string id
 * @property string meeting_id
 * @property string user_id
 * @property AttendanceType attendance_type
 * @property string attendance_status_dict_id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @method static MeetingAttendantBuilder query()
 */
class MeetingAttendant extends Model
{
    use UuidTrait;

    protected $table = 'meeting_attendants';

    protected $fillable = [
        'id',
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

}
