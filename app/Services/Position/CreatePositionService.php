<?php

namespace App\Services\Position;

use App\Exceptions\ApiException;
use App\Models\Facility;
use App\Models\Position;
use App\Services\DefaultOrderManager;
use App\Services\Dictionary\PositionRequiredAttributes;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreatePositionService
{
    use PositionValidation;

    /**
     * Expected $data keys: facility_id, dictionary_id, name, is_fixed, is_disabled,
     * default_order, plus any position attribute values.
     *
     * @throws ApiException|Throwable
     */
    public function handle(?Facility $facility, array $data): string
    {
        $dictionary = $this->assertDictionaryUsable($data['dictionary_id'], $data['facility_id'] ?? null);

        $data['is_fixed'] ??= false;
        $position = new Position();
        $position->fillOnly($data);

        DB::transaction(function () use ($position, $facility, $data, $dictionary) {
            $position->default_order = DefaultOrderManager::insert(
                table: 'positions',
                scopeColumn: 'dictionary_id',
                scopeValue: $position->dictionary_id,
                requested: $data['default_order'] ?? null,
            );
            $position->attrSave($facility, $data);
            PositionRequiredAttributes::assertPositionHasValues(
                $position,
                PositionRequiredAttributes::of($dictionary),
            );
        });
        return $position->id;
    }
}
