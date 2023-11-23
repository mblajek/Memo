<?php

namespace App\Http\Resources;

use App\Exceptions\FatalExceptionFactory;
use App\Models\BaseModel;
use App\Utils\Date\DateHelper;
use Closure;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

abstract class AbstractJsonResource extends JsonResource
{
    abstract protected static function getMappedFields(): array;

    private static array $classMappedFields = [];

    protected function withAttrValues(): bool
    {
        return false;
    }

    public static function makeOrNull($resource): ?JsonResource
    {
        return $resource ? self::make($resource) : null;
    }

    public function toArray(Request $request): array
    {
        if (!array_key_exists(static::class, self::$classMappedFields)) {
            $mappedFields = static::getMappedFields();
            if (array_is_list($mappedFields)) {
                $mappedFields = array_fill_keys($mappedFields, true);
            }
            self::$classMappedFields[static::class] = $mappedFields;
        }
        $result = [];
        foreach (self::$classMappedFields[static::class] as $propertyName => $mapping) {
            $property = null;
            if ($mapping === true) {
                $property = $this->{Str::snake($propertyName)};
            } elseif ($mapping === false) {
                $property = $this->{$propertyName};
            } elseif ($mapping instanceof Closure) {
                $property = $mapping($this);
            }
            if ($property instanceof DateTimeInterface) {
                $property = DateHelper::toZuluString($property);
            }
            $result[$propertyName] = $property;
        }
        if ($this->withAttrValues()) {
            $resource = $this->resource;
            if ($resource instanceof BaseModel) {
                $result += $resource->attrValues();
            } else {
                FatalExceptionFactory::unexpected()->throw();
            }
        }
        return $result;
    }
}
