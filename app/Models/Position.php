<?php

namespace App\Models;

use App\Models\QueryBuilders\PositionBuilder;
use App\Utils\Uuid\UuidTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string dictionary_id
 * @property string facility_id
 * @property string name
 * @property bool is_fixed
 * @property bool is_disabled
 * @property int default_order
 * @property-read Member $member
 * @method static PositionBuilder query()
 */
class Position extends BaseModel
{
    use HasFactory;
    use UuidTrait;

    protected $table = 'positions';

    protected $fillable = [
        'dictionary_id',
        'facility_id',
        'name',
        'is_fixed',
        'is_disabled',
        'default_order',
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'is_fixed' => 'boolean',
        'is_disabled' => 'boolean',
    ];

    protected $with = ['dictionary'];

    public function dictionary(): BelongsTo
    {
        return $this->belongsTo(Dictionary::class);
    }
}
