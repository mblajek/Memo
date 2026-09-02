<?php

namespace App\Services\Dictionary;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Dictionary;

/** Guards for rows in other tables that reference a dictionary. */
final class DictionaryReference
{
    /**
     * Asserts that a row scoped to the given facility may reference the dictionary:
     * the dictionary must be global or belong to the same facility.
     *
     * @throws ApiException
     */
    public static function assertFacilityMatch(Dictionary $dictionary, ?string $facilityId): void
    {
        if ($dictionary->facility_id !== null && $dictionary->facility_id !== $facilityId) {
            throw ExceptionFactory::fieldValidation('dictionaryId', 'different_facility');
        }
    }
}
