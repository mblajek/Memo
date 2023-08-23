<?php

namespace Database\Factories;

use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => Str::uuid(),
            'facility_id' => Str::uuid(),
            'staff_member_id' => null,
            'client_id' => null,
            'facility_admin_grant_id' => null,
        ];
    }
}
