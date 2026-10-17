<?php

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\Client;
use App\Models\Facility;
use App\Models\Value;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Reading attribute values reflects the model's current state and the requested facility,
 * however many times they are read.
 */
class AttrValuesTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Attribute::clearCacheAll();
    }

    public function testReflectsColumnAttributeChangedAfterPreviousRead(): void
    {
        $client = new Client();
        $client->setAttribute('notes', 'first');
        self::assertSame('first', $client->attrValues()['notes'] ?? null);

        $client->setAttribute('notes', 'second');
        self::assertSame('second', $client->attrValues()['notes'] ?? null);
    }

    public function testFiltersByFacilityOfEachRead(): void
    {
        $facility = Facility::factory()->create();
        $otherFacility = Facility::factory()->create();
        $attribute = Attribute::create([
            'facility_id' => $facility->id,
            'table' => 'clients',
            'name' => 'attrvaluestest',
            'api_name' => 'attrvaluestest',
            'type' => 'string',
            'default_order' => (Attribute::query()->where('table', 'clients')->max('default_order') ?? 0) + 1,
            'is_multi_value' => false,
            'is_fixed' => false,
            'requirement_level' => 'optional',
        ]);
        Attribute::clearCacheAll();

        $client = new Client();
        $client->setAttribute('notes', 'unsaved');
        $client->setRelation('values', $client->newCollection([
            new Value(['attribute_id' => $attribute->id, 'string_value' => 'facility value']),
        ]));

        self::assertSame('facility value', $client->attrValues($facility)['attrvaluestest'] ?? null);
        self::assertArrayNotHasKey('attrvaluestest', $client->attrValues($otherFacility));
    }
}
