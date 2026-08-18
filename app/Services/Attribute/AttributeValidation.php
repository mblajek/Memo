<?php

namespace App\Services\Attribute;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeType;
use App\Models\Value;
use App\Services\Dictionary\DictionaryReference;
use App\Utils\Transformer\StringTransformer;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use ValueError;

/** Domain validations shared by the attribute create/update/delete services. */
trait AttributeValidation
{
    /** @var array<string, list<string>> */
    private static array $tableColumns = [];

    /**
     * Converts the camelCase input api_name to its stored snake_case form, asserting that the
     * name survives the round trip under both converters used in the system (Str for the
     * attribute services and resources, StringTransformer for request/response keys). A name
     * failing this (e.g. producing a digit-initial snake segment) would silently lose values
     * or crash key conversion.
     *
     * @throws ApiException
     */
    protected function snakeApiName(string $apiName): string
    {
        $snake = Str::snake($apiName);
        try {
            $valid = Str::camel($snake) === $apiName
                && StringTransformer::snake($apiName) === $snake
                && StringTransformer::camel($snake) === $apiName;
        } catch (ValueError) {
            $valid = false;
        }
        if (!$valid) {
            throw ExceptionFactory::fieldValidation('apiName', 'regex');
        }
        return $snake;
    }

    /** @throws ApiException */
    protected function assertDictionaryTypeMatch(string $type, ?string $dictionaryId): void
    {
        if (($dictionaryId === null) === ($type === AttributeType::Dict->value)) {
            throw ExceptionFactory::fieldValidation('dictionaryId', 'required_for_dict_type');
        }
    }

    /** @throws ApiException */
    protected function assertDictionaryFacilityMatch(?string $dictionaryId, ?string $facilityId): void
    {
        if ($dictionaryId !== null) {
            DictionaryReference::assertFacilityMatch(
                Dictionary::query()->findOrFail($dictionaryId),
                $facilityId,
            );
        }
    }

    /**
     * Escalating an existing attribute to required is not allowed — rows created before the
     * change would silently violate the requirement. Any other level change is always valid.
     *
     * @throws ApiException
     */
    protected function assertRequirementLevelChangeAllowed(Attribute $attribute, ?string $target): void
    {
        if ($target === AttributeRequirementLevel::Required->value
            && $attribute->requirement_level !== AttributeRequirementLevel::Required) {
            throw ExceptionFactory::fieldValidation('requirementLevel', 'only_on_create');
        }
    }

    /**
     * A separator can never hold a value, so any requirement level other than empty would
     * demand the impossible.
     *
     * @throws ApiException
     */
    protected function assertRequirementLevelMatchesType(?string $type, ?string $target): void
    {
        if ($target !== null && $target !== AttributeRequirementLevel::Empty->value
            && $type === AttributeType::Separator->value) {
            throw ExceptionFactory::fieldValidation(
                'requirementLevel',
                'in',
                ['values' => [AttributeRequirementLevel::Empty->value]],
            );
        }
    }

    /** @throws ApiException */
    protected function assertApiNameUnique(string $table, string $apiName, ?string $ignoreId = null): void
    {
        // an api_name shadowing a physical column would make attrSave() write bogus value rows
        self::$tableColumns[$table] ??= Schema::getColumnListing($table);
        if (in_array($apiName, self::$tableColumns[$table], true)) {
            throw ExceptionFactory::fieldValidation('apiName', 'reserved');
        }
        $query = Attribute::query()->where('table', $table)->where('api_name', $apiName);
        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }
        if ($query->exists()) {
            throw ExceptionFactory::fieldValidation('apiName', 'unique');
        }
    }

    /** @throws ApiException */
    protected function assertNotFixed(Attribute $attribute): void
    {
        if ($attribute->is_fixed) {
            throw ExceptionFactory::fieldValidation('id', 'not_editable');
        }
    }

    /** @throws ApiException */
    protected function assertNotReferenced(Attribute $attribute): void
    {
        // ref_object_id holds references to this attribute from values of "attributes"-type attributes
        $referenced = Value::query()->where('attribute_id', $attribute->id)->exists()
            || Value::query()->where('ref_object_id', $attribute->id)->exists();
        if ($referenced) {
            throw ExceptionFactory::fieldValidation('id', 'in_use');
        }
    }
}
