<?php

namespace App\Services\Dictionary;

use App\Exceptions\ApiException;
use App\Models\Dictionary;
use App\Models\Facility;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateDictionaryService
{
    use DictionaryValidation;

    /** @throws ApiException|Throwable */
    public function handle(Dictionary $dictionary, ?Facility $facility, array $data): void
    {
        $this->assertNotFixed($dictionary);
        if (array_key_exists('name', $data)) {
            $this->assertNameAvailable($data['name'], $dictionary->facility_id, $dictionary->id);
        }
        $requiredTouched = array_key_exists(PositionRequiredAttributes::API_NAME, $data);
        if ($requiredTouched) {
            PositionRequiredAttributes::assertAreForPositions(
                $data[PositionRequiredAttributes::API_NAME],
                $dictionary->facility_id,
            );
        }
        $dictionary->fillOnly($data);
        DB::transaction(function () use ($dictionary, $facility, $data, $requiredTouched) {
            $dictionary->attrSave($facility, $data);
            if ($requiredTouched) {
                PositionRequiredAttributes::assertAllPositionsHaveValues($dictionary);
            }
        });
    }
}
