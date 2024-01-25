<?php

namespace App\Models;

use App\Models\QueryBuilders\FacilityBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rule;

/**
 * @property string name
 * @property string url
 * @property ?string timetable_id
 * @property-read Timetable $timetable
 * @method static FacilityBuilder query()
 */
class Facility extends Model
{
    use BaseModel;
    use HasValidator;

    protected $table = 'facilities';

    protected $fillable = [
        'name',
        'url',
        'timetable_id',
    ];

    protected $casts = self::BASE_CASTS;

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'name' => Valid::trimmed(),
            'url' => Valid::trimmed([
                'max:30',
                'lowercase',
                'regex:/^[a-z][a-z0-9-]+[a-z0-9]$/',
                'not_in:admin,user,api,system,login,help,home',
                Rule::unique('facilities', 'url'),
            ]),
        };
    }

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }
}
