<?php

namespace App\Models;

use App\Models\QueryBuilders\DictionaryBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string id
 * @property string name
 * @property bool is_fixed
 * @property bool is_extendable
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Collection $positions
 * @method static DictionaryBuilder query()
 */
class Dictionary extends BaseModel
{
    use HasFactory;
    use UuidTrait;

    protected $table = 'dictionaries';

    protected $fillable = [
        'facility_id',
        'name',
        'is_fixed',
        'is_extendable',
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'is_fixed' => 'boolean',
        'is_extendable' => 'boolean',
    ];

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class);
    }

    public function getSortedPositions(): Collection
    {
        return $this->positions->sort(fn(Position $a, Position $b) => $a->default_order <=> $b->default_order);
    }
}
