<?php

namespace Tests\Feature\Tquery;

use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Models\Position;

class DictionaryTqueryTest extends TqueryTestCase
{
    private const URL = '/api/v1/system/dictionary/tquery';
    private const LIST_URL = '/api/v1/system/dictionary/list';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private int $seq = 0;

    private function createDictionary(array $overrides = [], array $attributeValues = []): Dictionary
    {
        $this->seq++;
        $dictionary = new Dictionary();
        $dictionary->fillOnly(array_merge([
            'facility_id' => null,
            'name' => "+TestDict{$this->seq}",
            'is_fixed' => false,
            'is_extendable' => true,
        ], $overrides));
        $dictionary->attrSave(null, $attributeValues); // also persists the dictionary
        return $dictionary;
    }

    private function createPosition(Dictionary $dictionary, int $order): void
    {
        $this->seq++;
        $position = new Position();
        $position->fillOnly([
            'dictionary_id' => $dictionary->id,
            'facility_id' => null,
            'name' => "+TestPos{$this->seq}",
            'is_fixed' => false,
            'is_disabled' => false,
            'default_order' => $order,
        ]);
        $position->save();
    }

    /** Creates an attribute on the (unseeded) grants table, returning its id (used as a referenced value). */
    private function createGrantAttribute(): string
    {
        $this->seq++;
        return Attribute::query()->create([
            'facility_id' => null,
            'table' => AttributeTable::Grant,
            'name' => "test_attr_{$this->seq}",
            'api_name' => "test_attr_{$this->seq}",
            'type' => AttributeType::String,
            'dictionary_id' => null,
            'default_order' => 800_000 + $this->seq,
            'is_multi_value' => null,
            'is_fixed' => false,
            'requirement_level' => AttributeRequirementLevel::Optional,
            'description' => null,
            'metadata' => null,
        ])->id;
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet(self::URL);
        $columnNames = array_column($config['columns'], 'name');
        foreach ([
            'id', 'facility.id', 'name', 'isFixed', 'isExtendable',
            'positions.count', 'dictionary.positionRequiredAttributeIds',
        ] as $column) {
            $this->assertContains($column, $columnNames);
        }
    }

    /**
     * Builds its own dictionaries (so it does not depend on seed data, e.g. in CI) and asserts the tquery
     * exposes the same values as /dictionary/list, including the nontrivial positions subquery count and
     * the positionRequiredAttributeIds attribute list. Both endpoints are scoped to the created ids.
     */
    public function testMatchesListEndpoint(): void
    {
        $facility = Facility::factory()->create();
        $requiredAttributeIds = [$this->createGrantAttribute(), $this->createGrantAttribute()];

        $globalDict = $this->createDictionary(
            ['name' => '+GlobalTestDict'],
            ['position_required_attribute_ids' => $requiredAttributeIds],
        );
        $this->createPosition($globalDict, 1);
        $this->createPosition($globalDict, 2);
        $facilityDict = $this->createDictionary(['name' => '+FacilityTestDict', 'facility_id' => $facility->id]);
        $this->createPosition($facilityDict, 1);

        $ids = [$globalDict->id, $facilityDict->id];
        $list = $this->tpiGet(self::LIST_URL . '?in=' . implode(',', $ids))['data'];
        $this->assertCount(2, $list);
        $resourceById = [];
        foreach ($list as $dictionary) {
            $resourceById[$dictionary['id']] = $dictionary;
        }

        $rowById = [];
        foreach ($this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns(
                'id', 'facility.id', 'name', 'isFixed', 'isExtendable',
                'positions.count', 'dictionary.positionRequiredAttributeIds',
            ),
            'filter' => self::filterColumn('id', 'in', $ids),
            'paging' => self::paging(10),
        ]), 2) as $row) {
            $rowById[$row['id']] = $row;
        }

        foreach ($ids as $id) {
            $resource = $resourceById[$id];
            $row = $rowById[$id];
            $this->assertSame($resource['facilityId'], $row['facility.id'], "facilityId mismatch for $id");
            $this->assertSame($resource['name'], $row['name'], "name mismatch for $id");
            $this->assertSame($resource['isFixed'], $row['isFixed'], "isFixed mismatch for $id");
            $this->assertSame($resource['isExtendable'], $row['isExtendable'], "isExtendable mismatch for $id");
            $this->assertSame(count($resource['positions']), $row['positions.count'], "positions.count mismatch for $id");
            $this->assertEqualsCanonicalizing(
                $resource['positionRequiredAttributeIds'] ?? [],
                $row['dictionary.positionRequiredAttributeIds'] ?? [],
                "positionRequiredAttributeIds mismatch for $id",
            );
        }

        // Make sure the nontrivial columns were actually exercised with non-empty values.
        $this->assertSame(2, $rowById[$globalDict->id]['positions.count']);
        $this->assertSame(1, $rowById[$facilityDict->id]['positions.count']);
        $this->assertEqualsCanonicalizing(
            $requiredAttributeIds,
            $rowById[$globalDict->id]['dictionary.positionRequiredAttributeIds'],
        );
    }
}
