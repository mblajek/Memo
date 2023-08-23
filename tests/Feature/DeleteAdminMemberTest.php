<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class DeleteAdminMemberTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/member/%s';

    public function testWithoutDataReturnSuccess(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-123',
            'timetable_id' => null,
        ]);
        /** @var Member $member */
        $member = Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $facility->id,
        ]);

        $result = $this->delete(sprintf(static::URL, $member->id));

        $result->assertOk();
        $this->assertNull(Member::query()->where('id', $member->id)->first());
    }
}
