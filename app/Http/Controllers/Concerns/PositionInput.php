<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Facility;
use App\Models\Position;

/** Request validation shared by the dictionary position admin endpoints. */
trait PositionInput
{
    private const array POSITION_INSERT_FIELDS = ['dictionary_id', 'name', 'is_fixed', 'is_disabled', 'default_order'];

    private const array POSITION_PATCH_FIELDS = ['name', 'is_fixed', 'is_disabled', 'default_order'];

    /**
     * @param ?Facility $attributesFacility scope for position attribute values (null for global rows)
     * @param list<string> $extraFields additional whitelisted fields, e.g. facility_id
     */
    private function positionInsertData(?Facility $attributesFacility, array $extraFields = []): array
    {
        return $this->validate(Position::getInsertValidator(
            [...self::POSITION_INSERT_FIELDS, ...$extraFields],
            $attributesFacility,
        ));
    }

    /** @param ?Facility $attributesFacility scope for position attribute values (null for global rows) */
    private function positionPatchData(Position $position, ?Facility $attributesFacility): array
    {
        return $this->validate(
            Position::getPatchValidator(self::POSITION_PATCH_FIELDS, $position, $attributesFacility)
            + Position::getProhibitedValidator(['dictionary_id']),
        );
    }
}
