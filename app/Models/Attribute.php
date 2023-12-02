<?php

namespace App\Models;

use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\QueryBuilders\AttributeBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasUuid;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property ?string facility_id
 * @property string name
 * @property string api_name
 * @property AttributeType type
 * @property ?string dictionary_id
 * @property int default_order
 * @property ?bool is_multi_value
 * @property AttributeRequirementLevel requirement_level
 * @method static AttributeBuilder query()
 */
class Attribute extends Model
{
    use BaseModel;

    protected $table = 'attributes';

    protected $fillable = [
        'facility_id',
        'table',
        'api_name',
        'type',
        'dictionary_id',
        'default_order',
        'is_multi_value',
        'requirement_level',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'table' => AttributeTable::class,
        'type' => AttributeType::class,
        'is_multi_value' => 'boolean',
        'requirement_level' => AttributeRequirementLevel::class,
    ];
}
