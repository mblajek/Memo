<?php

namespace Database\Factories;

use App\Models\Facility;
use Exception;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Facility>
 */
class FacilityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     * @throws Exception
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'url' => Str::random(5),
            'timetable_id' => Str::uuid(),
        ];
    }
}
