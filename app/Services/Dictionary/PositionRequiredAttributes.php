<?php

namespace App\Services\Dictionary;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Position;
use App\Models\Value;
use Illuminate\Support\Str;

/**
 * The `position_required_attributes` values of a dictionary list the attributes that every
 * position in that dictionary must have a value for.
 */
final class PositionRequiredAttributes
{
    public const string API_NAME = 'position_required_attribute_ids';

    /** @return list<Attribute> the attributes required on positions of the dictionary */
    public static function of(Dictionary $dictionary): array
    {
        $ids = $dictionary->attrValues()[self::API_NAME] ?? [];
        // ids of attributes deleted before referential guards existed are skipped, not fatal
        return array_values(array_filter(array_map(
            fn(string $id) => Attribute::getCacheByIdNullable($id),
            $ids,
        )));
    }

    /**
     * @param ?list<string> $attributeIds
     * @throws ApiException when any of the ids is not a position attribute usable by rows
     * scoped to the given facility (the attribute must be global or of the same facility)
     */
    public static function assertAreForPositions(?array $attributeIds, ?string $facilityId): void
    {
        foreach ($attributeIds ?? [] as $attributeId) {
            // nullable lookup: the cache snapshot may predate a just-committed attribute
            $attribute = Attribute::getCacheByIdNullable($attributeId);
            // separators can never hold a value, so requiring one would block every position
            $code = ($attribute === null
                || $attribute->getAttributeValue('table') !== AttributeTable::Position
                || $attribute->type === AttributeType::Separator) ? 'exists'
                : (($attribute->facility_id !== null && $attribute->facility_id !== $facilityId)
                    ? 'different_facility' : null);
            if ($code !== null) {
                throw ExceptionFactory::fieldValidation(Str::camel(self::API_NAME), $code);
            }
        }
    }

    /**
     * @param list<Attribute> $required
     * @throws ApiException when the position lacks a value for any required attribute
     */
    public static function assertPositionHasValues(Position $position, array $required): void
    {
        $exception = null;
        foreach (self::missingAttributesOf($position, $required) as $attribute) {
            $exception ??= ExceptionFactory::validation();
            $exception->addValidation(Str::camel($attribute->api_name), 'required');
        }
        if ($exception !== null) {
            throw $exception;
        }
    }

    /** @throws ApiException when any position of the dictionary lacks a required value */
    public static function assertAllPositionsHaveValues(Dictionary $dictionary): void
    {
        $required = self::of($dictionary);
        if (!$required) {
            return;
        }
        $positions = $dictionary->positions;
        $present = self::presentValues($positions->modelKeys(), self::valueBacked($required));
        foreach ($positions as $position) {
            if (self::missingAttributes($position, $required, $present[$position->id] ?? [])) {
                throw ExceptionFactory::fieldValidation(Str::camel(self::API_NAME), 'missing_on_positions');
            }
        }
    }

    /**
     * @param list<Attribute> $required
     * @return list<Attribute>
     */
    private static function missingAttributesOf(Position $position, array $required): array
    {
        $present = self::presentValues([$position->id], self::valueBacked($required));
        return self::missingAttributes($position, $required, $present[$position->id] ?? []);
    }

    /**
     * @param list<Attribute> $required
     * @param array<string, true> $presentAttributeIds
     * @return list<Attribute>
     */
    private static function missingAttributes(Position $position, array $required, array $presentAttributeIds): array
    {
        return array_values(array_filter($required, fn(Attribute $attribute)
            => ($attribute->is_multi_value === null)
                // null is_multi_value means the value lives in a physical column on the positions table
                ? ($position->getAttribute($attribute->api_name) === null)
                : !isset($presentAttributeIds[$attribute->id])));
    }

    /** @param list<Attribute> $required @return list<Attribute> */
    private static function valueBacked(array $required): array
    {
        return array_values(array_filter(
            $required,
            fn(Attribute $attribute) => $attribute->is_multi_value !== null,
        ));
    }

    /**
     * @param list<string> $positionIds
     * @param list<Attribute> $attributes
     * @return array<string, array<string, true>> object id => set of present attribute ids
     */
    private static function presentValues(array $positionIds, array $attributes): array
    {
        if (!$attributes || !$positionIds) {
            return [];
        }
        $present = [];
        $values = Value::query()
            ->whereIn('object_id', $positionIds)
            ->whereIn('attribute_id', array_map(fn(Attribute $attribute) => $attribute->id, $attributes))
            ->distinct()
            ->get(['object_id', 'attribute_id']);
        foreach ($values as $value) {
            $present[$value->object_id][$value->attribute_id] = true;
        }
        return $present;
    }
}
