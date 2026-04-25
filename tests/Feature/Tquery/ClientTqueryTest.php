<?php

namespace Tests\Feature\Tquery;

use App\Models\Client;
use App\Models\Facility;
use App\Models\Member;
use App\Models\User;

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

    private function createClient(string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $client = new Client();
        $client->user_id = $user->id;
        $client->facility_id = $this->facility->id;
        $client->short_code = '-';
        $client->type_dict_id = 'd1c57dfc-c118-49ff-ae38-6585645349ca'; // adult
        $client->saveOrFail();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'client_id' => $client->id,
        ]);
        return $user;
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
}
