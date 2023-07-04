<?php

namespace Tests\Feature;

use App\Models\Facility;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class PostAdminFacilityTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/facility';

    public function testWithValidDataReturnSuccess(): void
    {
        $data = [
            'name' => 'Test',
            'url' => 'test-123',
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(Facility::query()->where('id', $result->json('data.id'))->first()->id);
    }
}
