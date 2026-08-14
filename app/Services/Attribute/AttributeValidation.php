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
use Illuminate\Support\Facades\Schema;

/** Domain validations shared by the attribute create/update/delete services. */
trait AttributeValidation
{
    /** @var array<string, list<string>> */
    private static array $tableColumns = [];

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
