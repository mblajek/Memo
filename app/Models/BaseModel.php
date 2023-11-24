<?php

namespace App\Models;

use App\Exceptions\FatalExceptionFactory;
use App\Utils\Uuid\UuidTrait;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property string id
 * @property-read Collection<Value> values
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 */
class BaseModel extends Model
{
    use HasFactory;
    use UuidTrait;

    public function values(): HasMany
    {
        return $this->hasMany(Value::class, 'object_id');
    }

    private ?array $attrValues = null;

    public function attrValues(): array
    {
        if ($this->attrValues === null || $this->isDirty() === false) {
            $attrValues = [];
            $attrValuesOrder = [];
            foreach ($this->values as $value) {
                $attribute = $value->attribute;
                $apiName = Str::camel($attribute->api_name);
                $isMultiValue = $attribute->is_multi_value;
                $singleValue = $value->getScalarValue();
                $attrValuesOrder[$apiName] = $attribute->default_order;
                if (!array_key_exists($apiName, $attrValues)) {
                    $attrValues[$apiName] = $isMultiValue ? [$singleValue] : $singleValue;
                } elseif ($isMultiValue) {
                    $attrValues[$apiName][] = $singleValue;
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
