<?php

namespace App\Http\Resources;

use App\Exceptions\FatalExceptionFactory;
use App\Utils\Transformer\StringTransformer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

abstract class AbstractJsonResource extends JsonResource
{
    abstract protected static function getMappedFields(): array;

    /** @var array<non-falsy-string, array<non-falsy-string, Mapping>> */
    private static array $classMappedFields = [];

    protected function withAttrValues(): bool
    {
        return false;
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
            self::$classMappedFields[static::class] = array_map(Mapping::any(...), $mappedFields);
        }
        $result = [];
        foreach (self::$classMappedFields[static::class] as $propertyName => $mapping) {
            $result[$propertyName] = $mapping->map($this, $propertyName);
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
