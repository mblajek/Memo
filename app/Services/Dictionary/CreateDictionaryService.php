<?php

namespace App\Services\Dictionary;

use App\Exceptions\ApiException;
use App\Models\Dictionary;
use App\Models\Facility;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreateDictionaryService
{
    use DictionaryValidation;

    /**
     * Expected $data keys: facility_id, name, is_fixed, is_extendable, plus any dictionary
     * attribute values. $facility scopes facility-specific attribute resolution (null for
     * system-wide dictionaries).
     *
     * @throws ApiException|Throwable
     */
    public function handle(?Facility $facility, array $data): string
    {
        $this->assertNameAvailable($data['name'], $data['facility_id'] ?? null);
        if (array_key_exists(PositionRequiredAttributes::API_NAME, $data)) {
            PositionRequiredAttributes::assertAreForPositions(
                $data[PositionRequiredAttributes::API_NAME],
                $data['facility_id'] ?? null,
            );
        }
        $data['is_fixed'] ??= false;
        $dictionary = new Dictionary();
        $dictionary->fillOnly($data);
        DB::transaction(fn() => $dictionary->attrSave($facility, $data));
        return $dictionary->id;
    }
}
