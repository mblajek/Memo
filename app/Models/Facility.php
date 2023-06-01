<?php

namespace App\Models;

use App\Models\QueryBuilders\FacilityBuilder;
use App\Utils\Uuid\UuidTrait;
use App\Utils\Validation\HasValidator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rule;

/**
 * @property string id
 * @property string name
 * @property string url
 * @property ?string timetable_id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Timetable $timetable
 * @method static FacilityBuilder query()
 */
class Facility extends Model
{
    use HasFactory;
    use UuidTrait;
    use HasValidator;

    protected $table = 'facilities';

    protected $fillable = [
        'name',
        'url',
        'timetable_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'name' => 'required|string',
            'url' => [
                'bail',
                'required',
                'string',
                'max:15',
                'lowercase',
                'regex:/^[a-z][a-z0-9-]+[a-z0-9]$/',
                'not_in:admin,user,api,system',
                Rule::unique('facilities', 'url'),
            ],
        };
    }

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }
}
