<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Dictionary;
use App\Models\Facility;

/** Request validation shared by the dictionary admin endpoints. */
trait DictionaryInput
{
    private const array DICTIONARY_INSERT_FIELDS = ['name', 'is_fixed'];

    private const array DICTIONARY_PATCH_FIELDS = ['name', 'is_fixed'];

    /**
     * @param ?Facility $attributesFacility scope for dictionary attribute values (null for global rows)
     * @param list<string> $extraFields additional whitelisted fields, e.g. facility_id
     */
    private function dictionaryInsertData(?Facility $attributesFacility, array $extraFields = []): array
    {
        return $this->validate(Dictionary::getInsertValidator(
            [...self::DICTIONARY_INSERT_FIELDS, ...$extraFields],
            $attributesFacility,
        ));
    }

    /**
     * @param ?Facility $attributesFacility scope for dictionary attribute values (null for global rows)
     * @param list<string> $extraFields additional whitelisted fields, e.g. is_extendable
     */
    private function dictionaryPatchData(
        Dictionary $dictionary,
        ?Facility $attributesFacility,
        array $extraFields = [],
    ): array {
        return $this->validate(Dictionary::getPatchValidator(
            [...self::DICTIONARY_PATCH_FIELDS, ...$extraFields],
            $dictionary,
            $attributesFacility,
        ));
    }
}
