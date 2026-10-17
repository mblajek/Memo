<?php

namespace Tests\Feature\Tquery;

use App\Exceptions\ApiException;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Services\Attribute\AttributeValidation;

class AttributeTqueryTest extends TqueryTestCase
{
    private const URL = '/api/v1/system/attribute/tquery';
    private const LIST_URL = '/api/v1/system/attribute/list';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private int $seq = 0;

    /** Creates an attribute on the (otherwise unseeded) grants table, returning its id. */
    private function createAttribute(array $overrides = []): string
    {
        $this->seq++;
        return Attribute::query()->create(array_merge([
            'facility_id' => null,
            'table' => AttributeTable::Grant,
            'name' => "test_attribute_{$this->seq}",
            'api_name' => "test_attribute_{$this->seq}",
            'type' => AttributeType::String,
            'dictionary_id' => null,
            'default_order' => 800_000 + $this->seq,
            'is_multi_value' => null,
            'is_fixed' => false,
            'requirement_level' => AttributeRequirementLevel::Optional,
            'description' => null,
            'metadata' => null,
        ], $overrides))->id;
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet(self::URL);
        $this->assertArrayHasKey('columns', $config);
        $columnNames = array_column($config['columns'], 'name');
        foreach ([
            'id', 'facility.id', 'name', 'apiName', 'type', 'dictionary.id',
            'defaultOrder', 'isMultiValue', 'isFixed', 'requirementLevel', 'description', 'metadata',
        ] as $column) {
            $this->assertContains($column, $columnNames);
        }
    }

    /**
     * Creates attributes covering various types and field combinations, then asserts the tquery exposes
     * the same values as the legacy /attribute/list endpoint (which serialises through AttributeResource:
     * camelCased name/apiName, verbatim '+'-prefixed names, camelCased metadata keys, etc.).
     * Both endpoints are scoped to the created ids. Only simple (non-joined) columns are requested, so the
     * `type` comparison is valid (scalar and dict types map back to their raw value).
     */
    public function testMatchesListEndpointForVariousAttributes(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::query()->create([
            'facility_id' => null,
            'name' => '+TestDictForAttributeTquery',
            'is_fixed' => false,
            'is_extendable' => true,
        ]);

        $ids = [
            // Plain string attribute: snake name/apiName get camelCased, with a description.
            $this->createAttribute(['description' => 'Plain string attribute']),
            // Custom '+'-prefixed name (kept verbatim), fixed, multi-value, with snake-keyed metadata.
            $this->createAttribute([
                'name' => '+CustomName',
                'type' => AttributeType::Int,
                'is_fixed' => true,
                'is_multi_value' => true,
                'requirement_level' => AttributeRequirementLevel::Required,
                'metadata' => ['some_key' => 'value', 'nested_obj' => ['inner_key' => 1, 'another_one' => true]],
            ]),
            // Dict-typed attribute pointing at a dictionary, single-value.
            $this->createAttribute([
                'type' => AttributeType::Dict,
                'dictionary_id' => $dictionary->id,
                'is_multi_value' => false,
                'requirement_level' => AttributeRequirementLevel::Recommended,
            ]),
            // Facility-scoped attribute, bool type, "empty" requirement level.
            $this->createAttribute([
                'facility_id' => $facility->id,
                'type' => AttributeType::Bool,
                'requirement_level' => AttributeRequirementLevel::Empty,
                'description' => 'Facility scoped attribute',
            ]),
            // Text type, single-value, flat snake-keyed metadata.
            $this->createAttribute([
                'type' => AttributeType::Text,
                'is_multi_value' => false,
                'metadata' => ['just_one_key' => 'x'],
            ]),
        ];

        $list = $this->tpiGet(self::LIST_URL . '?in=' . implode(',', $ids))['data'];
        $this->assertCount(count($ids), $list);
        $resourceById = [];
        foreach ($list as $attribute) {
            $resourceById[$attribute['id']] = $attribute;
        }

        $rows = $this->assertTqueryData(
            $this->tpiPost(self::URL, [
                'columns' => self::columns(
                    'id', 'facility.id', 'name', 'apiName', 'type', 'dictionary.id', 'isFixed',
                    'defaultOrder', 'isMultiValue', 'requirementLevel', 'description', 'metadata',
                ),
                'filter' => self::filterColumn('id', 'in', $ids),
                'paging' => self::paging(count($ids) + 10),
            ]),
            count($ids),
        );

        foreach ($rows as $row) {
            $id = $row['id'];
            $resource = $resourceById[$id];
            $this->assertSame($resource['facilityId'], $row['facility.id'], "facilityId mismatch for $id");
            $this->assertSame($resource['name'], $row['name'], "name mismatch for $id");
            $this->assertSame($resource['apiName'], $row['apiName'], "apiName mismatch for $id");
            $this->assertSame($resource['type'], $row['type'], "type mismatch for $id");
            $this->assertSame($resource['dictionaryId'], $row['dictionary.id'], "dictionaryId mismatch for $id");
            $this->assertSame($resource['isFixed'], $row['isFixed'], "isFixed mismatch for $id");
            $this->assertSame($resource['defaultOrder'], $row['defaultOrder'], "defaultOrder mismatch for $id");
            $this->assertSame($resource['isMultiValue'], $row['isMultiValue'], "isMultiValue mismatch for $id");
            $this->assertSame($resource['requirementLevel'], $row['requirementLevel'], "requirementLevel mismatch for $id");
            $this->assertSame($resource['description'], $row['description'], "description mismatch for $id");
            // The list endpoint returns metadata as a (camelCased-key) object; the tquery returns a JSON string.
            $metadata = $row['metadata'] === null ? null : json_decode($row['metadata'], true);
            $this->assertEquals($resource['metadata'], $metadata, "metadata mismatch for $id");
        }
    }

    /** Filters on name and apiName match the camelCased values the tquery returns, not the stored ones. */
    public function testNameAndApiNameFiltersMatchExposedValues(): void
    {
        $fixedNameId = $this->createAttribute(['name' => 'tq_exposed_filter_one', 'api_name' => 'tq_exposed_filter_one']);
        $customNameId = $this->createAttribute(['name' => '+Tq_exposed_filter', 'api_name' => 'tq_exposed_filter_two']);
        $matchingIds = fn(array $filter) => array_column($this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id'),
            'filter' => $filter,
            'paging' => self::paging(10),
        ])), 'id');

        $this->assertSame([$fixedNameId], $matchingIds(self::filterColumn('apiName', '=', 'tqExposedFilterOne')));
        $this->assertSame([$customNameId], $matchingIds(self::filterColumn('apiName', '%v%', 'ExposedFilterT')));
        $this->assertEqualsCanonicalizing(
            [$fixedNameId, $customNameId],
            $matchingIds(self::filterColumn('apiName', '/v/', '^tqExposedFilter(One|Two)$')),
        );
        $this->assertSame([], $matchingIds(self::filterColumn('apiName', '=', 'tq_exposed_filter_one')));
        $this->assertSame([$fixedNameId], $matchingIds(self::filterColumn('name', '=', 'tqExposedFilterOne')));
        $this->assertSame([$customNameId], $matchingIds(self::filterColumn('name', '=', '+Tq_exposed_filter')));
    }

    /**
     * A camelCase name stored through the services' conversion to snake_case comes back unchanged
     * from the tquery's SQL conversion, as name and as apiName.
     */
    public function testSqlCamelCaseRestoresStoredNames(): void
    {
        $converter = new class () {
            use AttributeValidation;

            public function snake(string $apiName): ?string
            {
                try {
                    return $this->snakeApiName($apiName);
                } catch (ApiException) {
                    return null;
                }
            }
        };
        $inputs = [
            'ab', 'a1', 'aB', 'aBC', 'aBCDef', 'abC', 'a1B', 'a1b', 'aB1', 'a1B2', 'a1b2C3', 'abc123Def',
            'x9Y', 'aZ', 'zA', 'aAA', 'aZz9', 'abcDefGhiJklMnoPqrStuVwxYz',
        ];
        mt_srand(20261017);
        $chars = 'abyzABYZ019';
        for ($i = 0; $i < 300; $i++) {
            $input = 'a';
            for ($length = mt_rand(1, 10); $length > 0; $length--) {
                $input .= $chars[mt_rand(0, strlen($chars) - 1)];
            }
            $inputs[] = $input;
        }
        $idsByInput = [];
        foreach (array_unique($inputs) as $input) {
            $snake = $converter->snake($input);
            if ($snake !== null) {
                $idsByInput[$input] = $this->createAttribute(['name' => $snake, 'api_name' => $snake]);
            }
        }
        $this->assertGreaterThan(200, count($idsByInput));

        $rows = $this->assertTqueryData(
            $this->tpiPost(self::URL, [
                'columns' => self::columns('id', 'name', 'apiName'),
                'filter' => self::filterColumn('id', 'in', array_values($idsByInput)),
                'paging' => self::paging(count($idsByInput)),
            ]),
            count($idsByInput),
        );
        $rowsById = array_column($rows, null, 'id');
        foreach ($idsByInput as $input => $id) {
            $this->assertSame($input, $rowsById[$id]['apiName'], "apiName of $input");
            $this->assertSame($input, $rowsById[$id]['name'], "name of $input");
        }
    }

    /** Sorting by name orders by the camelCased value the tquery returns, not by the stored one. */
    public function testNameSortMatchesExposedValues(): void
    {
        // Stored, "_" sorts before "b"; exposed, "Z" sorts after "b" (case-insensitively).
        $ids = [
            $this->createAttribute(['name' => 'tq_exposed_sort_a_z']),
            $this->createAttribute(['name' => 'tq_exposed_sort_ab']),
        ];
        $rows = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('name'),
            'filter' => self::filterColumn('id', 'in', $ids),
            'sort' => [self::sort('name')],
            'paging' => self::paging(10),
        ]));
        $this->assertSame(['tqExposedSortAb', 'tqExposedSortAZ'], array_column($rows, 'name'));
    }

    /** The joined facility.name / dictionary.name columns resolve to the related records' names. */
    public function testJoinedColumns(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::query()->create([
            'facility_id' => null,
            'name' => '+JoinedColumnsDict',
            'is_fixed' => false,
            'is_extendable' => true,
        ]);
        $facilityAttributeId = $this->createAttribute(['facility_id' => $facility->id]);
        $dictAttributeId = $this->createAttribute(['type' => AttributeType::Dict, 'dictionary_id' => $dictionary->id]);

        $rows = $this->assertTqueryData(
            $this->tpiPost(self::URL, [
                'columns' => self::columns('id', 'facility.name', 'dictionary.name'),
                'filter' => self::filterColumn('id', 'in', [$facilityAttributeId, $dictAttributeId]),
                'paging' => self::paging(10),
            ]),
            2,
        );
        $byId = [];
        foreach ($rows as $row) {
            $byId[$row['id']] = $row;
        }
        $this->assertSame($facility->name, $byId[$facilityAttributeId]['facility.name']);
        $this->assertNull($byId[$facilityAttributeId]['dictionary.name']);
        $this->assertSame($dictionary->name, $byId[$dictAttributeId]['dictionary.name']);
        $this->assertNull($byId[$dictAttributeId]['facility.name']);
    }
}
