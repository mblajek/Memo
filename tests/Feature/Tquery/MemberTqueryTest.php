<?php

namespace Tests\Feature\Tquery;

use App\Models\Facility;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;

/** AI-generated (Opus 4.6) */
class MemberTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'MemberTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/user/tquery";
    }

    private function createMember(string $name, bool $staff = false): User
    {
        $user = User::factory()->create(['name' => $name]);
        $staffId = null;
        if ($staff) {
            $staffMember = StaffMember::factory()->create();
            $staffId = $staffMember->id;
        }
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'staff_member_id' => $staffId,
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
        $this->assertContains('member.isStaff', $columnNames);
        $this->assertContains('member.isClient', $columnNames);
    }

    public function testQueries(): void
    {
        // 16 rows: groups aaa/bbb/ccc/ddd × suffixes 111/222/333/444
        // aaa/bbb: staff=true, ccc/ddd: staff=false
        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $grp) {
            $isStaff = in_array($grp, ['aaa', 'bbb']);
            foreach (['111', '222', '333', '444'] as $sfx) {
                $this->createMember("MTQ $grp $sfx", staff: $isStaff);
            }
        }
        // Total: 16 rows (8 staff, 8 non-staff)

        // = exact match → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '=', 'MTQ aaa 111'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('MTQ aaa 111', $data[0]['name']);

        // v% starts with "MTQ aaa" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'MTQ aaa'),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringStartsWith('MTQ aaa', $row['name']);
        }

        // %v ends with "111" scoped to MTQ → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'MTQ'),
                self::filterColumn('name', '%v', '111'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('111', $row['name']);
        }

        // %v% contains "MTQ ccc" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'MTQ ccc'),
            'paging' => self::paging(50),
        ]), 4);

        // /v/ regexp: names matching "MTQ [bd]" → 8
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '/v/', '^MTQ [bd]'),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^MTQ [bd]/', $row['name']);
        }

        // in: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'in', ['MTQ aaa 111', 'MTQ bbb 222', 'MTQ ccc 333']),
            'paging' => self::paging(50),
        ]), 3);
        $names = array_column($data, 'name');
        $this->assertContains('MTQ aaa 111', $names);
        $this->assertContains('MTQ bbb 222', $names);
        $this->assertContains('MTQ ccc 333', $names);

        // bool = true on member.isStaff → 8 (aaa + bbb groups)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name', 'member.isStaff'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'MTQ'),
                self::filterColumn('member.isStaff', '=', true),
            ]),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertTrue($row['member.isStaff']);
        }

        // bool = false on member.isStaff → 8 (ccc + ddd groups)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name', 'member.isStaff'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'MTQ'),
                self::filterColumn('member.isStaff', '=', false),
            ]),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertFalse($row['member.isStaff']);
        }

        // & AND: MTQ aaa AND isStaff=true → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name', 'member.isStaff'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', '%v%', 'MTQ aaa'),
                self::filterColumn('member.isStaff', '=', true),
            ]),
            'paging' => self::paging(50),
        ]), 4);

        // | OR: aaa 111 OR ccc 111 → 2
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('name', '=', 'MTQ aaa 111'),
                self::filterColumn('name', '=', 'MTQ ccc 111'),
            ]),
            'paging' => self::paging(50),
        ]), 2);

        // inverted: MTQ staff rows except aaa group → 4 (bbb group only)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'MTQ'),
                self::filterColumn('member.isStaff', '=', true),
                ['type' => 'column', 'column' => 'name', 'op' => '%v%', 'val' => 'MTQ aaa', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringContainsString('MTQ bbb', $row['name']);
        }

        // sort ascending: MTQ aaa rows → 111,222,333,444
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'MTQ aaa'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('MTQ aaa 111', $data[0]['name']);
        $this->assertEquals('MTQ aaa 222', $data[1]['name']);
        $this->assertEquals('MTQ aaa 333', $data[2]['name']);
        $this->assertEquals('MTQ aaa 444', $data[3]['name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'MTQ aaa'),
            'sort' => [self::sort('name', desc: true)],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('MTQ aaa 444', $data[0]['name']);
        $this->assertEquals('MTQ aaa 111', $data[3]['name']);

        // pagination: 16 rows, page size 5 → 4 pages (last has 1)
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'MTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(16, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'MTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 1);

        // distinct on member.isStaff: 2 values (true: 8, false: 8)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('member.isStaff', '_count'),
            'filter' => self::filterColumn('name', 'v%', 'MTQ'),
            'distinct' => true,
            'paging' => self::paging(50),
        ]), 2);
        foreach ($data as $row) {
            $this->assertArrayHasKey('_count', $row);
            $this->assertEquals(8, $row['_count']);
        }
    }
}
