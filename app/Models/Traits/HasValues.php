<?php

namespace App\Models\Traits;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Value;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    public function attrValues(bool $byId = false): array
    {
        if ($this->attrValues === null || $this->isDirty() === false) {
            $attrValues = [];
            $attrValuesOrder = [];
            foreach ($this->values as $value) {
                $attribute = $value->attribute;
                $arrayKey = $byId ? $attribute->id : Str::camel($attribute->api_name);
                $isMultiValue = $attribute->is_multi_value;
                $singleValue = $value->getScalarValue();
                $attrValuesOrder[$arrayKey] = $attribute->default_order;
                if (!array_key_exists($arrayKey, $attrValues)) {
                    $attrValues[$arrayKey] = $isMultiValue ? [$singleValue] : $singleValue;
                } elseif ($isMultiValue) {
                    $attrValues[$arrayKey][] = $singleValue;
                } else {
                    FatalExceptionFactory::unexpected()->throw();
                }
                uksort($attrValues, fn(string $a, string $b) => $attrValuesOrder[$a] <=> $attrValuesOrder[$b]);
            }
            $this->attrValues = $attrValues;
        }
        return $this->attrValues;
    }
}
