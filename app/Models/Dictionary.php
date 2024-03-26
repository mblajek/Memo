<?php

namespace App\Models;

use App\Models\Attributes\HasValues;
use App\Models\QueryBuilders\DictionaryBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;

/**
 * @property string name
 * @property bool is_fixed
 * @property bool is_extendable
 * @property-read Collection $positions
 * @method static DictionaryBuilder query()
 */
class Dictionary extends Model
{
    use BaseModel;
    use HasValidator;
    use HasValues;

    protected $table = 'dictionaries';

    protected $fillable = [
        'facility_id',
        'name',
        'is_fixed',
        'is_extendable',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'is_fixed' => 'boolean',
        'is_extendable' => 'boolean',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')], nullable: true),
            'name' => Valid::trimmed(),
            'is_fixed', 'is_extendable' => Valid::bool(),
        };
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderBy('positions.default_order');
    }
}
