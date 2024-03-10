<?php

namespace App\Models\Traits;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Attribute;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Models\Value;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property string id
 * @property-read Collection<Value> values
 * @mixin Model
 */
trait HasValues
{
    private ?array $attrValues = null;

    public function values(): HasMany
    {
        return $this->hasMany(Value::class, 'object_id');
    }

    protected function castValue(int|string|bool|null $value, AttributeType $type): Carbon|bool|int|string|null
    {
        return ($value === null) ? null : match ($type) {
            AttributeType::Bool => (bool)$value,
            AttributeType::Date => Str::match('/^[-\\d]+/', $value), // date part from datetime string
            AttributeType::Datetime => $this->asDateTime($value), // default datetime cast
            AttributeType::Int => (int)$value,
            default => (string)$value,
        };
    }

    public function attrValues(null|Facility|string|true $facility = null): array
    {
        $table = AttributeTable::from($this->table);
        $attributes = Attribute::getBy(facility: $facility, table: $table);
        $modelAttributes = $this->getAttributes();

        if ($this->attrValues === null || $this->isDirty() === false) {
            $attrValues = [];
            foreach ($attributes as $attribute) {
                $apiName = $attribute->api_name;
                $attrValues[$apiName] = ($attribute->is_multi_value !== null) ? null
                    : $this->castValue($modelAttributes[$apiName], $attribute->type);
            }
            foreach ($this->values as $value) {
                $attribute = $value->attribute();
                $apiName = $attribute->api_name;
                if (!array_key_exists($apiName, $attrValues)) {
                    // value belongs to another facility attribute
                    continue;
                }
                $valueValue = $this->castValue($value->getTypeColumnValue(), $attribute->type);
                if ($attribute->is_multi_value) {
                    if ($attrValues[$apiName] === null) {
                        $attrValues[$apiName] = [];
                    }
                    $attrValues[$apiName][] = $valueValue;
                } else {
                    if ($attrValues[$apiName] !== null) {
                        // single attribute has multiple values
                        FatalExceptionFactory::unexpected()->throw();
                    }
                    $attrValues[$apiName] = $valueValue;
                }
            }
            $this->attrValues = array_filter($attrValues, fn(mixed $attrValue) => $attrValue !== null);
        }
        return $this->attrValues;
    }
}
