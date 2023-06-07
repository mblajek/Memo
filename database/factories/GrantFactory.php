<?php

namespace Database\Factories;

use App\Models\Grant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Grant>
 */
class GrantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'created_by' => 'e144ff18-471f-456f-a1c2-971d88b3d213',
        ];
    }
}
