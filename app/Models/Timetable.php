<?php

namespace App\Models;

use App\Models\QueryBuilders\TimetableBuilder;
use App\Models\Traits\BaseModel;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read Collection|Facility[] $facilities
 * @method static TimetableBuilder query()
 */
class Timetable extends Model
{
    use BaseModel;

    protected $table = 'timetables';

    protected $casts = self::BASE_CASTS;

    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }
}
