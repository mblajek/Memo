<?php

namespace App\Models;

use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;

/**
 * @property string id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Collection|Facility[] $facilities
 */
class Timetable extends Model
{
    use HasFactory, Notifiable, UuidTrait;

    protected $table = 'timetables';

    protected $fillable = [

    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }
}
