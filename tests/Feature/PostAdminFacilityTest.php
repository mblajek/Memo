<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Grant;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class PostAdminFacilityTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/admin/facility';

    public function testWithValidDataReturnSuccess(): void
    {
        /** @var Grant $grant */
        $grant = Grant::factory()->create();
        /** @var User $user */
        $user = User::factory()->create(['global_admin_grant_id' => $grant->id]);
        Auth::setUser($user);

        $data = [
            'name' => 'Test',
            'url' => 'test-123',
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(Facility::query()->where('id', $result->json('data.id'))->first()->id);
    }
}
