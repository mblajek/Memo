<?php

namespace Tests\Feature\Tquery;

use App\Models\Facility;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;

/** AI-generated (Opus 4.6) */
class StaffTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'StaffTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/user/staff/tquery";
    }

    private function createStaff(string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $staff = StaffMember::factory()->create();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'staff_member_id' => $staff->id,
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
        $this->assertContains('staff.hasFacilityAdmin', $columnNames);
    }

    public function testQueries(): void
    {
        // 16 rows: groups aaa/bbb/ccc/ddd × suffixes 111/222/333/444
        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $grp) {
            foreach (['111', '222', '333', '444'] as $sfx) {
                $this->createStaff("STQ $grp $sfx");
            }
        }
        // Total: 16 rows

        // = exact match → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '=', 'STQ aaa 111'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('STQ aaa 111', $data[0]['name']);

        // v% starts with "STQ aaa" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'STQ aaa'),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringStartsWith('STQ aaa', $row['name']);
        }

        // %v ends with "333" scoped to STQ → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'STQ'),
                self::filterColumn('name', '%v', '333'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('333', $row['name']);
        }

        // %v% contains "STQ ccc" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'STQ ccc'),
            'paging' => self::paging(50),
        ]), 4);

        // /v/ regexp: names matching "STQ [bd]" → 8
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '/v/', '^STQ [bd]'),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^STQ [bd]/', $row['name']);
        }

        // in: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'in', ['STQ aaa 111', 'STQ bbb 222', 'STQ ccc 333']),
            'paging' => self::paging(50),
        ]), 3);
        $names = array_column($data, 'name');
        $this->assertContains('STQ aaa 111', $names);
        $this->assertContains('STQ bbb 222', $names);
        $this->assertContains('STQ ccc 333', $names);

        // & AND: contains "STQ aaa" AND ends with "222" → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', '%v%', 'STQ aaa'),
                self::filterColumn('name', '%v', '222'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('STQ aaa 222', $data[0]['name']);

        // | OR: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('name', '=', 'STQ aaa 111'),
                self::filterColumn('name', '=', 'STQ bbb 111'),
                self::filterColumn('name', '=', 'STQ ccc 111'),
            ]),
            'paging' => self::paging(50),
        ]), 3);

        // inverted: STQ rows except ddd group → 12
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'STQ'),
                ['type' => 'column', 'column' => 'name', 'op' => '%v%', 'val' => 'STQ ddd', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 12);

        // sort ascending: STQ aaa rows → 111,222,333,444
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'STQ aaa'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('STQ aaa 111', $data[0]['name']);
        $this->assertEquals('STQ aaa 222', $data[1]['name']);
        $this->assertEquals('STQ aaa 333', $data[2]['name']);
        $this->assertEquals('STQ aaa 444', $data[3]['name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'STQ aaa'),
            'sort' => [self::sort('name', desc: true)],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('STQ aaa 444', $data[0]['name']);
        $this->assertEquals('STQ aaa 111', $data[3]['name']);

        // pagination: 16 rows, page size 5 → 4 pages (last has 1)
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'STQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(16, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']); // ceil(16/5)=4

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'STQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 1);
        $this->assertNotEquals($page1['data'][0]['id'], $page4['data'][0]['id']);

        // distinct on staff.hasFacilityAdmin: all are false → 1 distinct value with _count=16
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('staff.hasFacilityAdmin', '_count'),
            'filter' => self::filterColumn('name', 'v%', 'STQ'),
            'distinct' => true,
            'paging' => self::paging(50),
        ]), 1);
        $this->assertArrayHasKey('_count', $data[0]);
        $this->assertEquals(16, $data[0]['_count']);
        $this->assertFalse($data[0]['staff.hasFacilityAdmin']);
    }
}
