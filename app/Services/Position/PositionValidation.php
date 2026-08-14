<?php

namespace App\Services\Position;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Dictionary;
use App\Models\Position;
use App\Models\Value;
use App\Services\Dictionary\DictionaryReference;

/** Domain validations shared by the position create/update/delete services. */
trait PositionValidation
{
    /** Asserts that a position scoped to the given facility may be added to the dictionary.
     * @throws ApiException
     */
    protected function assertDictionaryUsable(string $dictionaryId, ?string $facilityId): Dictionary
    {
        $dictionary = Dictionary::query()->findOrFail($dictionaryId);
        if (!$dictionary->is_extendable) {
            throw ExceptionFactory::fieldValidation('dictionaryId', 'not_extendable');
        }
        DictionaryReference::assertFacilityMatch($dictionary, $facilityId);
        return $dictionary;
    }

    /** @throws ApiException */
    protected function assertNotFixed(Position $position): void
    {
        if ($position->is_fixed) {
            throw ExceptionFactory::fieldValidation('id', 'not_editable');
        }
    }

    /** @throws ApiException */
    protected function assertNotReferenced(Position $position): void
    {
        if (Value::query()->where('ref_dict_id', $position->id)->exists()) {
            throw ExceptionFactory::fieldValidation('id', 'in_use');
        }
    }
}
