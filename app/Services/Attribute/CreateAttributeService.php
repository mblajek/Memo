<?php

namespace App\Services\Attribute;

use App\Exceptions\ApiException;
use App\Models\Attribute;
use App\Models\Enums\AttributeTable;
use App\Services\DefaultOrderManager;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreateAttributeService
{
    use AttributeValidation;

    /**
     * Expected $data keys: facility_id, model, name, api_name, type, dictionary_id,
     * default_order, is_multi_value, requirement_level, description, metadata, is_fixed.
     *
     * @throws ApiException|Throwable
     */
    public function handle(array $data): string
    {
        $this->assertDictionaryTypeMatch($data['type'], $data['dictionary_id'] ?? null);
        $this->assertDictionaryFacilityMatch($data['dictionary_id'] ?? null, $data['facility_id'] ?? null);
        $this->assertRequirementLevelMatchesType($data['type'], $data['requirement_level'] ?? null);

        $data['is_fixed'] ??= false;
        $data['api_name'] = $this->snakeApiName($data['api_name']);
        $data['table'] = AttributeTable::{ucfirst($data['model'])}->value;

        $this->assertApiNameUnique($data['table'], $data['api_name']);

        $attribute = new Attribute();
        $attribute->fillOnly($data);

        DB::transaction(function () use ($attribute, $data) {
            $attribute->default_order = DefaultOrderManager::insert(
                table: 'attributes',
                scopeColumn: 'table',
                scopeValue: $attribute->table->value,
                requested: $data['default_order'] ?? null,
            );
            $attribute->saveOrFail();
        });
        return $attribute->id;
    }
}
