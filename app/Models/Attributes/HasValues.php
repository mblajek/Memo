<?php

namespace App\Models\Attributes;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Attribute;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Models\Traits\BaseModel;
use App\Models\Value;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property-read Collection<Value> values
 * @mixin Model
 */
trait HasValues
{
    use BaseModel;

    private ?array $attrValues = null;

    public function values(): HasMany
    {
        return $this->hasMany(Value::class, 'object_id')->orderBy('default_order');
    }

    private function attrCastValue(int|string|bool $value, AttributeType $type): Carbon|bool|int|string
    {
        return match ($type) {
            AttributeType::Bool => (bool)$value,
            AttributeType::Date => Str::match('/^[-\\d]+/', $value), // date part from datetime string
            AttributeType::Datetime => $this->asDateTime($value), // default datetime cast
            AttributeType::Int => (int)$value,
            default => (string)$value,
        };
    }

    private function attrCastDb(Carbon|bool|int|string $value, AttributeType $type): Carbon|bool|int|string
    {
        return match ($type) {
            AttributeType::Bool, AttributeType::Int => (int)$value,
            AttributeType::Date => Str::match('/^[-\\d]+/', $value), // date part from datetime string
            AttributeType::Datetime => $this->fromDateTime($value), // default datetime cast
            default => (string)$value,
        };
    }

    public static function attrTable(): AttributeTable
    {
        return AttributeTable::from(self::getInstanceField('table'));
    }

    /** @return array<string, Attribute> */
    public static function attrMap(null|Facility|string|true $facility = null): array
    {
        $attrMap = []; // todo: can be moved to static variable facility_id => list<Attribute>
        foreach (Attribute::getBy(facility: $facility, table: self::attrTable()) as $attribute) {
            $attrMap[$attribute->api_name] = $attribute;
        }
        return $attrMap;
    }

    public function attrValuesObjects(null|Facility|string|true $facility = null): array
    {
        $attributes = self::attrMap(facility: $facility);
        $modelAttributes = $this->getAttributes();

        if ($this->attrValues === null || $this->isDirty() === false) {
            $attrValues = [];
            foreach ($attributes as $attribute) {
                $apiName = $attribute->api_name;
                $attrValues[$apiName] =
                    ($attribute->is_multi_value === null && ($modelAttributes[$apiName] ?? null) !== null)
                        ? new ValueValue(null, $this->attrCastValue($modelAttributes[$apiName], $attribute->type))
                        : null;
            }
            foreach ($this->values as $value) {
                $attribute = $value->attribute();
                $apiName = $attribute->api_name;
                if (!array_key_exists($apiName, $attrValues)) {
                    // value belongs to another facility attribute
                    continue;
                }
                $valueValue = $this->attrCastValue($value->getTypeColumnValue(), $attribute->type);
                if ($attribute->is_multi_value) {
                    if ($attrValues[$apiName] === null) {
                        $attrValues[$apiName] = [];
                    }
                    $attrValues[$apiName][] = new ValueValue($value, $valueValue);
                } else {
                    if ($attrValues[$apiName] !== null) {
                        // single attribute has multiple values
                        FatalExceptionFactory::unexpected()->throw();
                    }
                    $attrValues[$apiName] = new ValueValue($value, $valueValue);
                }
            }
            $this->attrValues = array_filter($attrValues, fn(mixed $attrValue) => $attrValue !== null);
        }
        return $this->attrValues;
    }

    public function attrValues(null|Facility|string|true $facility = null): array
    {
        return array_map(fn(ValueValue|array $value) => ($value instanceof ValueValue) ? $value->valueScalar
            : array_map(fn(ValueValue $value) => $value->valueScalar, $value), $this->attrValuesObjects($facility));
    }

    public function attrSave(null|Facility|string|true $facility, array $data): void
    {
        $attrMap = self::attrMap($facility);
        $currentAllValues = $this->attrValuesObjects();
        $changed = false;
        foreach ([true, false] as $attributeIsMultiNull) {
            if (!$attributeIsMultiNull) {
                $this->save();
            }
            foreach ($data as $apiName => $dataValue) {
                /** @var Attribute $attribute */
                $attribute = $attrMap[$apiName] ?? null;
                if ($attribute === null) {
                    //todo: throw exception/warning
                    continue;
                }
                if (is_null($attribute->is_multi_value) !== $attributeIsMultiNull) {
                    continue;
                }
                /** @var ValueValue|list<ValueValue>|null $currentValue */
                $currentValue = $currentAllValues[$apiName] ?? null;
                $dataValue = in_array($dataValue, [null, []], true) ? null : (is_array($dataValue)
                    ? array_map(fn(mixed $value) => $this->attrCastDb($value, $attribute->type), $dataValue)
                    : $this->attrCastDb($dataValue, $attribute->type));
                if (($currentValue === null) && ($dataValue === null)) {
                    continue;
                }

                $isMultiValue = $attribute->is_multi_value;
                if (
                    (($currentValue !== null) && ($isMultiValue ?? false) !== is_array($currentValue))
                    || (($dataValue !== null) && ($isMultiValue ?? false) !== is_array($dataValue))
                    || (is_array($currentValue) && !array_is_list($currentValue))
                    || (is_array($dataValue) && !array_is_list($dataValue))
                ) {
                    FatalExceptionFactory::unexpected()->throw();
                }

                $changed = true;
                if ($isMultiValue === null) {
                    $this->setAttribute($apiName, $dataValue);
                    continue;
                }
                if ($currentValue !== null) {
                    foreach ($isMultiValue ? $currentValue : [$currentValue] as $currentSingleValue) {
                        $currentSingleValue->valueObject->delete();
                    }
                }
                if ($dataValue !== null) {
                    foreach ($isMultiValue ? $dataValue : [$dataValue] as $key => $dataSingleValue) {
                        $value = new Value(['attribute_id' => $attribute->id, 'default_order' => $key]);
                        $value->setTypeColumnValue($dataSingleValue);
                        $this->values()->save($value);
                    }
                }
            }
        }
        if ($changed) {
            $this->attrValues = null;
            $this->refresh();
        }
    }
}
