<?php

namespace App\Models;

use App\Models\QueryBuilders\ClientBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string id
 * @property string dictionary_id
 * @property string facility_id
 * @property string name
 * @property bool is_fixed
 * @property bool is_disabled
 * @property int default_order
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property-read Member $member
 * @method static ClientBuilder query()
 */
class Position extends Model
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

    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }
}
