<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class UpdateAdminMemberTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/member/%s';

    public function testWithValidDataReturnSuccess(): void
    {
        /** @var User $user1 */
        $user1 = User::factory()->create();
        /** @var Facility $facility1 */
        $facility1 = Facility::factory()->create([
            'name' => 'Test1',
            'url' => 'test-123',
            'timetable_id' => null,
        ]);
        /** @var Member $member */
        $member = Member::factory()->create([
            'user_id' => $user1->id,
            'facility_id' => $facility1->id,
        ]);

        /** @var User $user2 */
        $user2 = User::factory()->create();
        /** @var Facility $facility2 */
        $facility2 = Facility::factory()->create([
            'name' => 'Test2',
            'url' => 'test-345',
            'timetable_id' => null,
        ]);

        $data = [
            'userId' => $user2->id,
            'facilityId' => $facility2->id,
            'hasFacilityAdmin' => true,
        ];

        $result = $this->patch(sprintf(static::URL, $member->id), $data);

        $member->refresh();

        $result->assertOk();
        $this->assertEquals($data['userId'], $user2->id);
        $this->assertEquals($data['facilityId'], $facility2->id);
    }

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

        $result = $this->patch(sprintf(static::URL, $member->id));

        $facility->refresh();

        $result->assertOk();
        $this->assertEquals('Test', $facility->name);
        $this->assertEquals('test-123', $facility->url);
    }
}
