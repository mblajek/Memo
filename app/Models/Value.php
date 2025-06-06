<?php

namespace App\Models;

use App\Models\Enums\AttributeType;
use App\Models\QueryBuilders\ValueBuilder;
use App\Models\Traits\BaseModel;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $attribute_id
 * @property string $object_id
 * @property ?string $ref_dict_id
 * @property ?string $ref_object_id
 * @property ?string $string_value
 * @property ?int $int_value
 * @property ?string $datetime_value // no cast
 * @property int $default_order
 * @method static ValueBuilder query()
 */
class Value extends Model
{
    use BaseModel;

    protected $table = 'values';

    protected $fillable = [
        'attribute_id',
        'object_id',
        'ref_dict_id',
        'ref_object_id',
        'string_value',
        'int_value',
        'datetime_value',
        'created_by',
        'default_order',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    public function attribute(): Attribute
    {
        return Attribute::getCacheById($this->attribute_id);
    }

    public static function getTypeColumn(AttributeType $type): string
    {
        return match ($type) {
            AttributeType::Bool, AttributeType::Int => 'int_value',
            AttributeType::Date, AttributeType::Datetime => 'datetime_value',
            AttributeType::String, AttributeType::Text => 'string_value',
            AttributeType::Dict => 'ref_dict_id',
            default => 'ref_object_id',
        };
    }

    public function getAttributeColumn(): string
    {
        return self::getTypeColumn($this->attribute()->type);
    }

    public function getTypeColumnValue(): int|string|bool|null
    {
        return $this->getAttributeFromArray($this->getAttributeColumn());
    }

    public function setTypeColumnValue(int|string|bool $value): void
    {
        $this->setAttribute($this->getAttributeColumn(), $value);
    }
}
