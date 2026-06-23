<?php

namespace Tests\Feature\Tquery;

use App\Models\Attribute;
use App\Models\Client;
use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use App\Models\Value;

/** AI-generated (Opus 4.6) */
class ClientTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'ClientTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/user/client/tquery";
    }

    private function createClient(string $name, ?string $birthDate = null): User
    {
        $user = User::factory()->create(['name' => $name]);
        $client = new Client();
        $client->user_id = $user->id;
        $client->facility_id = $this->facility->id;
        $client->short_code = '-';
        $client->type_dict_id = 'd1c57dfc-c118-49ff-ae38-6585645349ca'; // adult
        $client->birth_date = $birthDate;
        $client->saveOrFail();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'client_id' => $client->id,
        ]);
        return $user;
    }

    /** A custom client attribute stored in the `values` table (is_multi_value false or true). */
    private function createDateAttribute(string $apiName, bool $multi): Attribute
    {
        $attribute = Attribute::query()->create([
            'facility_id' => $this->facility->id,
            'table' => 'clients',
            'name' => $apiName,
            'api_name' => $apiName,
            'type' => 'date',
            'dictionary_id' => null,
            'default_order' => 999000, // outside the seeded range; unique(table, default_order)
            'is_multi_value' => $multi,
            'is_fixed' => false,
            'requirement_level' => 'optional',
        ]);
        Attribute::clearCacheAll(); // config building reads the static attribute cache
        return $attribute;
    }

    private function setDateAttributeValue(Attribute $attribute, User $user, string $datetimeValue, int $order = 1): void
    {
        $client = Client::query()->where('user_id', $user->id)->firstOrFail();
        Value::query()->create([
            'attribute_id' => $attribute->id,
            'object_id' => $client->id,
            'datetime_value' => $datetimeValue,
            'default_order' => $order,
        ]);
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet($this->url);
        $this->assertArrayHasKey('columns', $config);
        $columnNames = array_column($config['columns'], 'name');
        $this->assertContains('id', $columnNames);
        $this->assertContains('name', $columnNames);
        $this->assertContains('client.groups.count', $columnNames);
    }

    public function testQueries(): void
    {
        // 16 rows: groups aaa/bbb/ccc/ddd × suffixes 111/222/333/444
        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $grp) {
            foreach (['111', '222', '333', '444'] as $sfx) {
                $this->createClient("CTQ $grp $sfx");
            }
        }
        // Total: 16 rows

        // = exact match → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '=', 'CTQ aaa 111'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('CTQ aaa 111', $data[0]['name']);

        // v% starts with "CTQ aaa" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'CTQ aaa'),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringStartsWith('CTQ aaa', $row['name']);
        }

        // %v ends with "444" scoped to CTQ → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'CTQ'),
                self::filterColumn('name', '%v', '444'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('444', $row['name']);
        }

        // %v% contains "CTQ bbb" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'CTQ bbb'),
            'paging' => self::paging(50),
        ]), 4);

        // /v/ regexp: names matching "CTQ [ac]" → 8
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '/v/', '^CTQ [ac]'),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^CTQ [ac]/', $row['name']);
        }

        // in: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'in', ['CTQ aaa 111', 'CTQ bbb 222', 'CTQ ccc 333']),
            'paging' => self::paging(50),
        ]), 3);
        $names = array_column($data, 'name');
        $this->assertContains('CTQ aaa 111', $names);
        $this->assertContains('CTQ bbb 222', $names);
        $this->assertContains('CTQ ccc 333', $names);

        // & AND: "CTQ ddd" AND ends with "333" → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', '%v%', 'CTQ ddd'),
                self::filterColumn('name', '%v', '333'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('CTQ ddd 333', $data[0]['name']);

        // | OR: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('name', '=', 'CTQ aaa 111'),
                self::filterColumn('name', '=', 'CTQ bbb 111'),
                self::filterColumn('name', '=', 'CTQ ccc 111'),
            ]),
            'paging' => self::paging(50),
        ]), 3);

        // inverted: CTQ rows except bbb group → 12
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'CTQ'),
                ['type' => 'column', 'column' => 'name', 'op' => '%v%', 'val' => 'CTQ bbb', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 12);

        // sort ascending: CTQ aaa rows → 111,222,333,444
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'CTQ aaa'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('CTQ aaa 111', $data[0]['name']);
        $this->assertEquals('CTQ aaa 222', $data[1]['name']);
        $this->assertEquals('CTQ aaa 333', $data[2]['name']);
        $this->assertEquals('CTQ aaa 444', $data[3]['name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'CTQ aaa'),
            'sort' => [self::sort('name', desc: true)],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('CTQ aaa 444', $data[0]['name']);
        $this->assertEquals('CTQ aaa 111', $data[3]['name']);

        // pagination: 16 rows, page size 5 → 4 pages (last has 1)
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'CTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(16, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'CTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 1);
        $this->assertNotEquals($page1['data'][0]['id'], $page4['data'][0]['id']);

        // distinct on name within CTQ: each name is unique, so 16 distinct rows with _count=1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('name', '_count'),
            'filter' => self::filterColumn('name', 'v%', 'CTQ'),
            'distinct' => true,
            'paging' => self::paging(50),
        ]), 16);
        foreach ($data as $row) {
            $this->assertArrayHasKey('_count', $row);
            $this->assertEquals(1, $row['_count']);
        }
    }

    // is_multi_value === false: single value-backed date attribute, stored in `values`.`datetime_value`.
    public function testSingleDateAttributeRendersAsDate(): void
    {
        $attribute = $this->createDateAttribute('customDate', multi: false);
        $user = $this->createClient('CTQ date');
        $this->setDateAttributeValue($attribute, $user, '2026-06-10 00:00:00');

        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'client.customDate'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertSame('2026-06-10', $data[0]['client.customDate']);
    }

    // is_multi_value === true: list of value-backed dates, aggregated with json_arrayagg.
    public function testMultiValueDateAttributeRendersAsDates(): void
    {
        $attribute = $this->createDateAttribute('customDates', multi: true);
        $user = $this->createClient('CTQ dates');
        $this->setDateAttributeValue($attribute, $user, '2026-06-10 00:00:00', order: 1);
        $this->setDateAttributeValue($attribute, $user, '2026-07-20 00:00:00', order: 2);

        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'client.customDates'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertSame(['2026-06-10', '2026-07-20'], $data[0]['client.customDates']);
    }

    // is_multi_value === null: fixed attribute backed by the real `clients`.`birth_date` DATE column.
    public function testFixedDateAttributeRendersAsDate(): void
    {
        $this->createClient('CTQ birth', birthDate: '2026-06-10');

        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'client.birthDate'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertSame('2026-06-10', $data[0]['client.birthDate']);
    }
}
