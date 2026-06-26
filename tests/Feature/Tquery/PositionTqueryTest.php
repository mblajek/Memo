<?php

namespace Tests\Feature\Tquery;

use App\Models\Dictionary;
use App\Models\Facility;
use App\Models\Position;

class PositionTqueryTest extends TqueryTestCase
{
    private const URL = '/api/v1/system/position/tquery';
    private const DICTIONARY_LIST_URL = '/api/v1/system/dictionary/list';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private int $seq = 0;

    private function createDictionary(): Dictionary
    {
        $this->seq++;
        $dictionary = new Dictionary();
        $dictionary->fillOnly([
            'facility_id' => null,
            'name' => "+TestDict{$this->seq}",
            'is_fixed' => false,
            'is_extendable' => true,
        ]);
        $dictionary->save();
        return $dictionary;
    }

    private function createPosition(Dictionary $dictionary, int $order, array $overrides = [], array $attributeValues = []): Position
    {
        $this->seq++;
        $position = new Position();
        $position->fillOnly(array_merge([
            'dictionary_id' => $dictionary->id,
            'facility_id' => null,
            'name' => "+TestPos{$this->seq}",
            'is_fixed' => false,
            'is_disabled' => false,
            'default_order' => $order,
        ], $overrides));
        $position->attrSave(null, $attributeValues); // also persists the position
        return $position;
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet(self::URL);
        $columnNames = array_column($config['columns'], 'name');
        foreach ([
            'id', 'dictionary.id', 'facility.id', 'name', 'isFixed', 'isDisabled', 'defaultOrder',
            'position.positionGroupDictId',
        ] as $column) {
            $this->assertContains($column, $columnNames);
        }
    }

    /**
     * Positions have no list endpoint, so this builds its own dictionary + positions (no reliance on seed
     * data, e.g. in CI) and compares the tquery against the positions nested in /dictionary/list, including
     * the nontrivial dict-typed positionGroupDictId attribute (stored in the values table).
     */
    public function testMatchesDictionaryPositions(): void
    {
        $facility = Facility::factory()->create();
        // A position to reference as the position group of another position.
        $groupPosition = $this->createPosition($this->createDictionary(), 1);

        $dictionary = $this->createDictionary();
        $withGroup = $this->createPosition($dictionary, 1, [], ['position_group_dict_id' => $groupPosition->id]);
        $this->createPosition($dictionary, 2, ['facility_id' => $facility->id, 'is_disabled' => true]);

        $resource = $this->tpiGet(self::DICTIONARY_LIST_URL . '?in=' . $dictionary->id)['data'][0];
        $this->assertCount(2, $resource['positions']);
        $positionsById = [];
        foreach ($resource['positions'] as $position) {
            $positionsById[$position['id']] = $position;
        }

        $rowById = [];
        foreach ($this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns(
                'id', 'dictionary.id', 'facility.id', 'name', 'isFixed', 'isDisabled', 'defaultOrder',
                'position.positionGroupDictId',
            ),
            'filter' => self::filterColumn('dictionary.id', '=', $dictionary->id),
            'paging' => self::paging(10),
        ]), 2) as $row) {
            $rowById[$row['id']] = $row;
        }

        foreach ($positionsById as $id => $position) {
            $row = $rowById[$id];
            $this->assertSame($dictionary->id, $row['dictionary.id'], "dictionaryId mismatch for $id");
            $this->assertSame($position['facilityId'], $row['facility.id'], "facilityId mismatch for $id");
            $this->assertSame($position['name'], $row['name'], "name mismatch for $id");
            $this->assertSame($position['isFixed'], $row['isFixed'], "isFixed mismatch for $id");
            $this->assertSame($position['isDisabled'], $row['isDisabled'], "isDisabled mismatch for $id");
            $this->assertSame($position['defaultOrder'], $row['defaultOrder'], "defaultOrder mismatch for $id");
            $this->assertSame(
                $position['positionGroupDictId'] ?? null,
                $row['position.positionGroupDictId'] ?? null,
                "positionGroupDictId mismatch for $id",
            );
        }

        // The dict-typed attribute column is exercised with a non-null value (the referenced position id).
        $this->assertSame($groupPosition->id, $rowById[$withGroup->id]['position.positionGroupDictId']);
    }
}
