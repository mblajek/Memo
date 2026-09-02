<?php

namespace App\Services\Dictionary;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Position;

/** Domain validations shared by the dictionary create/update/delete services. */
trait DictionaryValidation
{
    /**
     * Dictionary names act as identifiers for API consumers, so a name must be unambiguous
     * within its visibility scope: among global dictionaries and those of the same facility
     * (a global name must not collide with any dictionary at all).
     *
     * @throws ApiException
     */
    protected function assertNameAvailable(string $name, ?string $facilityId, ?string $ignoreId = null): void
    {
        $query = Dictionary::query()->where('name', $name);
        if ($facilityId !== null) {
            $query->where(fn($q) => $q->whereNull('facility_id')->orWhere('facility_id', $facilityId));
        }
        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }
        if ($query->exists()) {
            throw ExceptionFactory::fieldValidation('name', 'unique');
        }
    }

    /**
     * Only a global dictionary can be non-extendable: a facility dictionary must stay
     * extendable for the owning facility to be able to manage its positions.
     *
     * @throws ApiException
     */
    protected function assertCanBeNonExtendable(?string $facilityId): void
    {
        if ($facilityId !== null) {
            throw ExceptionFactory::fieldValidation('isExtendable', 'accepted');
        }
    }

    /**
     * A dictionary cannot become non-extendable while it has extensions: positions owned by
     * a facility other than the dictionary's own.
     *
     * @throws ApiException
     */
    protected function assertNoFacilityExtensions(Dictionary $dictionary): void
    {
        $query = $dictionary->positions()->whereNotNull('facility_id');
        if ($dictionary->facility_id !== null) {
            $query->where('facility_id', '!=', $dictionary->facility_id);
        }
        if ($query->exists()) {
            throw ExceptionFactory::fieldValidation('isExtendable', 'is_extended');
        }
    }

    /** @throws ApiException */
    protected function assertNotFixed(Dictionary $dictionary): void
    {
        if ($dictionary->is_fixed) {
            throw ExceptionFactory::fieldValidation('id', 'not_editable');
        }
    }

    /** @throws ApiException */
    protected function assertNotReferenced(Dictionary $dictionary): void
    {
        $referenced = Position::query()->where('dictionary_id', $dictionary->id)->exists()
            || Attribute::query()->where('dictionary_id', $dictionary->id)->exists();
        if ($referenced) {
            throw ExceptionFactory::fieldValidation('id', 'in_use');
        }
    }
}
