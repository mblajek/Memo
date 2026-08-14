<?php

namespace App\Services\Position;

use App\Exceptions\ApiException;
use App\Models\Attribute;
use App\Models\Facility;
use App\Models\Position;
use App\Services\DefaultOrderManager;
use App\Services\Dictionary\PositionRequiredAttributes;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdatePositionService
{
    use PositionValidation;

    /**
     * Patches a position. The owning dictionary is immutable; updatable keys are name,
     * is_disabled, default_order, plus any position attribute values.
     *
     * @throws ApiException|Throwable
     */
    public function handle(Position $position, ?Facility $facility, array $data): void
    {
        $this->assertNotFixed($position);

        $targetOrder = $data['default_order'] ?? null;
        unset($data['default_order']);

        $required = PositionRequiredAttributes::of($position->dictionary);
        // enforced only when the patch touches a required attribute, so pre-existing
        // non-compliant positions do not block unrelated edits
        $requiredTouched = (bool) array_intersect(
            array_map(fn(Attribute $attribute) => $attribute->api_name, $required),
            array_keys($data),
        );

        DB::transaction(function () use ($position, $facility, $data, $targetOrder, $required, $requiredTouched) {
            $position->fillOnly($data);
            $position->attrSave($facility, $data);
            if ($requiredTouched) {
                PositionRequiredAttributes::assertPositionHasValues($position, $required);
            }
            if ($targetOrder !== null) {
                DefaultOrderManager::reorder(
                    table: 'positions',
                    scopeColumn: 'dictionary_id',
                    scopeValue: $position->dictionary_id,
                    id: $position->id,
                    current: DefaultOrderManager::lockedOrder('positions', $position->id),
                    target: $targetOrder,
                );
            }
        });
    }
}
