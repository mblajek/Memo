<?php

namespace Database\Factories;

use App\Models\Dictionary;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Dictionary>
 */
class DictionaryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'facility_id' => null,
            'name' => fake()->unique()->words(2, true),
            'is_fixed' => false,
            'is_extendable' => true,
        ];
    }

    public function fixed(): static
    {
        return $this->state(fn() => ['is_fixed' => true]);
    }
}
