<?php

namespace App\Models;

use App\Models\QueryBuilders\MeetingResourceBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string id
 * @property string meeting_id
 * @property string resource_dict_id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @method static MeetingResourceBuilder query()
 */
class MeetingResource extends Model
{
    use UuidTrait;

    protected $table = 'meeting_resources';

    protected $fillable = [
        'meeting_id',
        'resource_dict_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];
}
