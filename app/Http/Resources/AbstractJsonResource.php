<?php

namespace App\Http\Resources;

use App\Exceptions\FatalExceptionFactory;
use App\Utils\Date\DateHelper;
use App\Utils\Transformer\StringTransformer;
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

    public static function makeOrNull(mixed $resource): ?JsonResource
    {
        return ($resource !== null) ? self::make($resource) : null;
    }

    public function toArray(Request $request): array
    {
        if (!array_key_exists(static::class, self::$classMappedFields)) {
            $mappedFields = static::getMappedFields();
            if (array_is_list($mappedFields)) {
                $mappedFields = array_fill_keys($mappedFields, true);
            }
            if ($this instanceof AbstractOpenApiResource) {
                $mappedFields += array_fill_keys(['createdAt', 'updatedAt', 'createdBy', 'updatedBy'], true);
            }
            self::$classMappedFields[static::class] = $mappedFields;
        }
        $result = [];
        foreach (self::$classMappedFields[static::class] as $propertyName => $mapping) {
            $property = null;
            if ($mapping === null) {
                continue;
            } elseif ($mapping === true) {
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
            if (method_exists($resource, 'attrValues')) {
                $result += StringTransformer::camelKeys($resource->attrValues());
            } else {
                FatalExceptionFactory::unexpected()->throw();
            }
        }
        return $result;
    }
}
