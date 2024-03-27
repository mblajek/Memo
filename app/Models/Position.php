<?php

namespace App\Models;

use App\Models\Attributes\HasValues;
use App\Models\QueryBuilders\PositionBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rule;

/**
 * @property string dictionary_id
 * @property string facility_id
 * @property string name
 * @property bool is_fixed
 * @property bool is_disabled
 * @property int default_order
 * @property-read Dictionary $dictionary
 * @method static PositionBuilder query()
 */
class Position extends Model
{
    use BaseModel;
    use HasValues;
    use HasValidator;

    protected $table = 'positions';

    protected $fillable = [
        'dictionary_id',
        'facility_id',
        'name',
        'is_fixed',
        'is_disabled',
        'default_order',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'is_fixed' => 'boolean',
        'is_disabled' => 'boolean',
    ];

    protected $with = ['dictionary'];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            //todo: dictionary exists in facility
            'dictionary_id' => Valid::uuid([Rule::exists('dictionaries', 'id')]),
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')], nullable: true),
            'name' => Valid::trimmed(),
            'is_fixed', 'is_disabled' => Valid::bool(),
            'default_order' => Valid::int(['min:1'], sometimes: true),
        };
    }

    public function dictionary(): BelongsTo
    {
        return $this->belongsTo(Dictionary::class);
    }
}
