<?php

namespace Tests\Feature\Tquery;

use App\Models\User;

/** AI-generated (Opus 4.6) */
class AdminUserTqueryTest extends TqueryTestCase
{
    private const URL = '/api/v1/admin/user/tquery';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet(self::URL);
        $this->assertArrayHasKey('columns', $config);
        $columnNames = array_column($config['columns'], 'name');
        $this->assertContains('id', $columnNames);
        $this->assertContains('name', $columnNames);
        $this->assertContains('email', $columnNames);
        $this->assertContains('hasPassword', $columnNames);
        $this->assertContains('hasGlobalAdmin', $columnNames);
    }

    public function testQueries(): void
    {
        // 16 rows: groups aaa/bbb/ccc/ddd × suffixes 111/222/333/444
        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $grp) {
            foreach (['111', '222', '333', '444'] as $sfx) {
                User::factory()->create([
                    'name' => "UTQ $grp $sfx",
                    'email' => "utq-$grp-$sfx@test.pl",
                ]);
            }
        }
        // 1 global admin user
        User::factory()->globalAdmin()->create([
            'name' => 'UTQ eee admin',
            'email' => 'utq-eee-admin@test.pl',
        ]);
        // 1 user with no email
        User::factory()->noEmail()->create(['name' => 'UTQ fff noemail']);
        // Total: 18 rows

        // = exact match → 1
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '=', 'UTQ aaa 111'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('UTQ aaa 111', $data[0]['name']);

        // v% starts with "UTQ aaa" → 4
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'UTQ aaa'),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringStartsWith('UTQ aaa', $row['name']);
        }

        // %v ends with "111" scoped to UTQ → 4
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'UTQ'),
                self::filterColumn('name', '%v', '111'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('111', $row['name']);
        }

        // %v% contains "UTQ bbb" → 4
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'UTQ bbb'),
            'paging' => self::paging(50),
        ]), 4);

        // /v/ regexp: names matching "UTQ [ac]" → 8
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '/v/', '^UTQ [ac]'),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^UTQ [ac]/', $row['name']);
        }

        // in: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'in', ['UTQ aaa 111', 'UTQ bbb 222', 'UTQ ccc 333']),
            'paging' => self::paging(50),
        ]), 3);
        $names = array_column($data, 'name');
        $this->assertContains('UTQ aaa 111', $names);
        $this->assertContains('UTQ bbb 222', $names);
        $this->assertContains('UTQ ccc 333', $names);

        // null on email → 1
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name', 'email'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'UTQ'),
                self::filterColumn('email', 'null'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('UTQ fff noemail', $data[0]['name']);
        $this->assertNull($data[0]['email']);

        // bool = true on hasGlobalAdmin (combined with UTQ filter) → 1 (UTQ eee admin)
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name', 'hasGlobalAdmin'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'UTQ'),
                self::filterColumn('hasGlobalAdmin', '=', true),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('UTQ eee admin', $data[0]['name']);
        $this->assertTrue($data[0]['hasGlobalAdmin']);

        // & AND
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name', 'email'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', '%v%', 'UTQ aaa'),
                self::filterColumn('email', '=', 'utq-aaa-222@test.pl'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('UTQ aaa 222', $data[0]['name']);

        // | OR: 3 specific users → 3
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('name', '=', 'UTQ aaa 111'),
                self::filterColumn('name', '=', 'UTQ bbb 111'),
                self::filterColumn('name', '=', 'UTQ ccc 111'),
            ]),
            'paging' => self::paging(50),
        ]), 3);

        // inverted: UTQ rows except bbb group → 14
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'UTQ'),
                ['type' => 'column', 'column' => 'name', 'op' => '%v%', 'val' => 'UTQ bbb', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 14);

        // sort ascending: UTQ aaa rows → 111,222,333,444
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'UTQ aaa'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('UTQ aaa 111', $data[0]['name']);
        $this->assertEquals('UTQ aaa 222', $data[1]['name']);
        $this->assertEquals('UTQ aaa 333', $data[2]['name']);
        $this->assertEquals('UTQ aaa 444', $data[3]['name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'UTQ aaa'),
            'sort' => [self::sort('name', desc: true)],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('UTQ aaa 444', $data[0]['name']);
        $this->assertEquals('UTQ aaa 111', $data[3]['name']);

        // pagination: 18 rows, page size 5 → 4 pages
        $page1 = $this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'UTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(18, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);

        $page4 = $this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'UTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 3);
        $this->assertNotEquals($page1['data'][0]['id'], $page4['data'][0]['id']);

        // distinct on hasGlobalAdmin within UTQ: 2 distinct values (true, false)
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('hasGlobalAdmin', '_count'),
            'filter' => self::filterColumn('name', 'v%', 'UTQ'),
            'distinct' => true,
            'paging' => self::paging(50),
        ]));
        $this->assertGreaterThanOrEqual(2, count($data));
        foreach ($data as $row) {
            $this->assertArrayHasKey('_count', $row);
            $this->assertArrayHasKey('hasGlobalAdmin', $row);
        }
        // admins row: 1, non-admins row: 17
        $adminRows = array_values(array_filter($data, fn($r) => $r['hasGlobalAdmin'] === true));
        $this->assertCount(1, $adminRows);
        $this->assertEquals(1, $adminRows[0]['_count']);
    }
}
