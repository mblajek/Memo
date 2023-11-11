<?php

namespace App\Models;

use App\Models\Enums\AttributeModel;
use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\QueryBuilders\AttributeBuilder;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string id
 * @property ?string facility_id
 * @property AttributeTable table
 * @property AttributeModel model
 * @property string name
 * @property string api_name
 * @property AttributeType type
 * @property ?string dictionary_id
 * @property int default_order
 * @property ?bool is_multi_value
 * @property AttributeRequirementLevel requirement_level
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @method static AttributeBuilder query()
 */
class Attribute extends Model
{
    use HasFactory;
    use UuidTrait;

    protected $table = 'attributes';

    protected $fillable = [
        'facility_id',
        'table',
        'model',
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
        'model' => AttributeModel::class,
        'type' => AttributeType::class,
        'is_multi_value' => 'boolean',
        'requirement_level' => AttributeRequirementLevel::class,
    ];
}
