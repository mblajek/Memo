<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\Helpers\AdminEndpointHelpers;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class PostAdminMemberTest extends TestCase
{
    use AdminEndpointHelpers;
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/member';

    public function testWithoutFacilityAdminReturnSuccess(): void
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-123',
        ]);
        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'userId' => $user->id,
            'facilityId' => $facility->id,
            'hasFacilityAdmin' => false,
            'isFacilityClient' => false,
            'isFacilityStaff' => false,
            'isActiveFacilityStaff' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(Member::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithFacilityAdminReturnSuccess(): void
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-123',
        ]);
        /** @var User $user */
        $user = User::factory()->create();

        $data = [
            'userId' => $user->id,
            'facilityId' => $facility->id,
            'hasFacilityAdmin' => true,
            'isFacilityClient' => false,
            'isFacilityStaff' => false,
            'isActiveFacilityStaff' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(Member::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testNonexistentUserReturnsValidationError(): void
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-123',
        ]);

        $data = [
            'userId' => Str::uuid()->toString(),
            'facilityId' => $facility->id,
            'hasFacilityAdmin' => false,
            'isFacilityClient' => false,
            'isFacilityStaff' => false,
            'isActiveFacilityStaff' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        self::assertContains('validation.exists', $this->fieldCodes($result, 'userId'));
        $this->assertFalse(Member::query()->where('facility_id', $facility->id)->exists());
    }
}
