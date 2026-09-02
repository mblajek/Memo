<?php

namespace Database\Factories;

use App\Models\Dictionary;
use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Position>
 */
class PositionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dictionary_id' => Dictionary::factory(),
            'facility_id' => null,
            'name' => fake()->unique()->words(2, true),
            'is_fixed' => false,
            'is_disabled' => false,
            'default_order' => 1,
        ];
    }

    public function fixed(): static
    {
        return $this->state(fn() => ['is_fixed' => true]);
    }
}
