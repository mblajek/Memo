<?php

namespace Tests\Feature;

use Database\Factories\FacilityFactory;
use Database\Factories\TimetableFactory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class GetFacilityListTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/system/facility/list';

    public function testWithValidDataReturnSuccess(): void
    {
        $startCount = count($this->get(static::URL)->json('data'));

        $timetable = TimetableFactory::new()->create();
        FacilityFactory::new()->count(5)->create(['timetable_id' => $timetable->id]);

        $result = $this->get(static::URL);

        $result->assertOk();
        $result->assertJsonStructure($this->jsonStructure());
        $this->assertCount(5 + $startCount, $result->json('data'));
    }

    public function testWithEmptyDataReturnSuccess(): void
    {
        $result = $this->get(static::URL);

        $result->assertOk();
        $result->assertJsonStructure(['data']);
    }

    private function jsonStructure(): array
    {
        return [
            'data' => [
                [
                    'id',
                    'name',
                    'url',
                ],
            ],
        ];
    }
}
