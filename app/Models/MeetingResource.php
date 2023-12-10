<?php

namespace App\Models;

use App\Models\QueryBuilders\MeetingResourceBuilder;
use App\Models\Traits\BaseModel;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string meeting_id
 * @property string resource_dict_id
 * @method static MeetingResourceBuilder query()
 */
class MeetingResource extends Model
{
    use BaseModel;

    protected $table = 'meeting_resources';

    protected $fillable = [
        'meeting_id',
        'resource_dict_id',
    ];

    protected $casts = self::BASE_CASTS;
}
