<?php

namespace Database\Factories;

use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Attribute>
 */
class AttributeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'facility_id' => null,
            // Grants have no seeded attributes, so factory rows never collide with them.
            'table' => AttributeTable::Grant->value,
            'name' => fake()->unique()->words(2, true),
            'api_name' => fake()->unique()->regexify('[a-z]{12}'),
            'type' => AttributeType::String->value,
            'dictionary_id' => null,
            // in the system order range, so factory rows never interfere with the managed
            // contiguous block of API-created rows
            'default_order' => DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET
                + fake()->unique()->numberBetween(1_000, 999_999),
            'is_multi_value' => false,
            'is_fixed' => false,
            'requirement_level' => AttributeRequirementLevel::Optional->value,
            'description' => null,
            'metadata' => null,
        ];
    }

    public function fixed(): static
    {
        return $this->state(fn() => ['is_fixed' => true]);
    }
}
