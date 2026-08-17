<?php

namespace App\Services\Attribute;

use App\Exceptions\ApiException;
use App\Models\Attribute;
use App\Services\DefaultOrderManager;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateAttributeService
{
    use AttributeValidation;

    /**
     * Patches an attribute. The target table, type, dictionary and multi-value flag are
     * immutable; updatable keys are name, api_name, default_order, requirement_level,
     * description, metadata.
     *
     * @throws ApiException|Throwable
     */
    public function handle(Attribute $attribute, array $data): void
    {
        $this->assertNotFixed($attribute);
        $this->assertRequirementLevelChangeAllowed($attribute, $data['requirement_level'] ?? null);

        if (array_key_exists('api_name', $data)) {
            $data['api_name'] = $this->snakeApiName($data['api_name']);
            $this->assertApiNameUnique($attribute->table->value, $data['api_name'], $attribute->id);
        }

        $targetOrder = $data['default_order'] ?? null;
        unset($data['default_order']);

        DB::transaction(function () use ($attribute, $data, $targetOrder) {
            $attribute->fillOnly($data);
            $attribute->saveOrFail();
            if ($targetOrder !== null) {
                DefaultOrderManager::reorder(
                    table: 'attributes',
                    scopeColumn: 'table',
                    scopeValue: $attribute->table->value,
                    id: $attribute->id,
                    current: DefaultOrderManager::lockedOrder('attributes', $attribute->id),
                    target: $targetOrder,
                );
            }
        });
    }
}
