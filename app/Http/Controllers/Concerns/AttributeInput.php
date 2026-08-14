<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Attribute;

/** Request validation shared by the attribute admin endpoints. */
trait AttributeInput
{
    private const array ATTRIBUTE_INSERT_FIELDS = [
        'is_fixed',
        'model',
        'name',
        'api_name',
        'type',
        'dictionary_id',
        'default_order',
        'is_multi_value',
        'requirement_level',
        'description',
        'metadata',
    ];

    private const array ATTRIBUTE_PATCH_FIELDS = [
        'is_fixed',
        'name',
        'api_name',
        'default_order',
        'requirement_level',
        'description',
        'metadata',
    ];

    /** @param list<string> $extraFields additional whitelisted fields, e.g. facility_id */
    private function attributeInsertData(array $extraFields = []): array
    {
        return $this->validate(Attribute::getInsertValidator([...self::ATTRIBUTE_INSERT_FIELDS, ...$extraFields]));
    }

    private function attributePatchData(Attribute $attribute): array
    {
        return $this->validate(
            Attribute::getPatchValidator(self::ATTRIBUTE_PATCH_FIELDS, $attribute)
            + Attribute::getProhibitedValidator(['model', 'type', 'dictionary_id', 'is_multi_value']),
        );
    }
}
