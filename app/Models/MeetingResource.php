<?php

namespace App\Models;

use App\Models\QueryBuilders\MeetingResourceBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * @property string meeting_id
 * @property string resource_dict_id
 * @method static MeetingResourceBuilder query()
 */
class MeetingResource extends Model
{
    use BaseModel;
    use HasValidator;

    protected $table = 'meeting_resources';

    protected $fillable = [
        'meeting_id',
        'resource_dict_id',
    ];

    protected $casts = self::BASE_CASTS;

    public static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'meeting_id' => Valid::uuid([Rule::exists('meetings')]),
            'resource_dict_id' => Valid::dict(DictionaryUuidEnum::MeetingResource),
        };
    }
}
