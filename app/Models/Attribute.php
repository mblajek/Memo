<?php

namespace App\Models;

use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\QueryBuilders\AttributeBuilder;
use App\Models\Traits\BaseModel;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqDictDef;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property ?string facility_id
 * @property AttributeTable table
 * @property string name
 * @property string api_name
 * @property AttributeType type
 * @property ?string dictionary_id
 * @property int default_order
 * @property ?bool is_multi_value
 * @property bool is_fixed
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
        'is_fixed',
        'requirement_level',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'table' => AttributeTable::class,
        'type' => AttributeType::class,
        'is_multi_value' => 'boolean',
        'is_fixed' => 'boolean',
        'requirement_level' => AttributeRequirementLevel::class,
    ];

    public function getTqueryDataType(): TqDataTypeEnum|TqDictDef
    {
        $nullable = $this->requirement_level->isNullable();
        $type = match ($this->type) {
            AttributeType::Bool => $nullable ? TqDataTypeEnum::bool_nullable : TqDataTypeEnum::bool,
            AttributeType::Date => $nullable ? TqDataTypeEnum::date_nullable : TqDataTypeEnum::date,
            AttributeType::Datetime => $nullable ? TqDataTypeEnum::datetime_nullable : TqDataTypeEnum::datetime,
            AttributeType::Int => $nullable ? TqDataTypeEnum::int_nullable : TqDataTypeEnum::int,
            AttributeType::String => $nullable ? TqDataTypeEnum::string_nullable : TqDataTypeEnum::string,
            AttributeType::Users, AttributeType::Clients, AttributeType::Attributes => $nullable ?
                TqDataTypeEnum::uuid_nullable : TqDataTypeEnum::uuid,
            AttributeType::Dict => $nullable ? TqDataTypeEnum::dict_nullable : TqDataTypeEnum::dict,
            AttributeType::Text =>  $nullable ? TqDataTypeEnum::text : TqDataTypeEnum::text_nullable,
        };
        return $type->isDict() ? (new TqDictDef($type, $this->dictionary_id)) : $type;
    }

    /** @return self[] */
    public static function getByFacility(Facility $facility, string $table): array
    {
        // todo: read from cache
        return self::query()->where(
            fn(Builder $builder) => $builder->orWhere('facility_id', $facility->id)->orWhereNull('facility_id')
        )->where('table', $table)->get()->all();
    }
}
