<?php

namespace App\Models;

use App\Models\QueryBuilders\FacilityBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;

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
    use Notifiable;
    use UuidTrait;

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

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }
}
