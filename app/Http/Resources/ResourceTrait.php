<?php

namespace App\Http\Resources;

use App\Utils\Date\DateHelper;
use Closure;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

trait ResourceTrait
{
    abstract protected static function getMappedFields(): array;

    private static array $classMappedFields = [];

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
            } elseif ($mapping instanceof Closure) {
                $property = $mapping($this);
            }
            if ($property instanceof DateTimeInterface) {
                $property = DateHelper::toZuluString($property);
            }
            $result[$propertyName] = $property;
        }
        return $result;
    }
}
