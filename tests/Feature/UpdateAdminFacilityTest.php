<?php

namespace Tests\Feature;

use App\Models\Facility;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class UpdateAdminFacilityTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/facility/%s';

    public function testWithValidDataReturnSuccess(): void
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-123',
            'timetable_id' => null,
        ]);

        $data = [
            'name' => 'Test1',
            'url' => 'test-456',
        ];

        $result = $this->patch(sprintf(static::URL, $facility->id), $data);

        $facility->refresh();

        $result->assertOk();
        $this->assertEquals($data['name'], $facility->name);
        $this->assertEquals($data['url'], $facility->url);
    }

    public function testWithSpecificFieldReturnSuccess(): void
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-456',
            'timetable_id' => null,
        ]);

        $data = [
            'name' => 'Test1',
        ];

        $result = $this->patch(sprintf(static::URL, $facility->id), $data);

        $facility->refresh();

        $result->assertOk();
        $this->assertEquals($data['name'], $facility->name);
        $this->assertEquals('test-456', $facility->url);
    }

    public function testWithoutDataReturnSuccess(): void
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create([
            'name' => 'Test',
            'url' => 'test-456',
            'timetable_id' => null,
        ]);

        $result = $this->patch(sprintf(static::URL, $facility->id));

        $facility->refresh();

        $result->assertOk();
        $this->assertEquals('Test', $facility->name);
        $this->assertEquals('test-456', $facility->url);
    }
}
