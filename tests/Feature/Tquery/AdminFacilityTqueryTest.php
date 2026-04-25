<?php

namespace Tests\Feature\Tquery;

use App\Models\Facility;

/** AI-generated (Opus 4.6) */
class AdminFacilityTqueryTest extends TqueryTestCase
{
    private const URL = '/api/v1/admin/facility/tquery';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet(self::URL);
        $this->assertArrayHasKey('columns', $config);
        $this->assertNotEmpty($config['columns']);
        $columnNames = array_column($config['columns'], 'name');
        $this->assertContains('id', $columnNames);
        $this->assertContains('name', $columnNames);
        $this->assertContains('url', $columnNames);
    }

    public function testQueries(): void
    {
        // 16 rows: groups aaa/bbb/ccc/ddd × suffixes 111/222/333/444
        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $grp) {
            foreach (['111', '222', '333', '444'] as $sfx) {
                Facility::factory()->create([
                    'name' => "FTQ $grp $sfx",
                    'url' => "ftq-$grp-$sfx",
                    'meeting_notification_template_subject' => "$grp-subject",
                ]);
            }
        }
        // 1 row with null subject
        Facility::factory()->create([
            'name' => 'FTQ eee null',
            'url' => 'ftq-eee-null',
            'meeting_notification_template_subject' => null,
        ]);
        // 1 row with literal % in name (for lv test)
        Facility::factory()->create([
            'name' => 'FTQ fff 100%done',
            'url' => 'ftq-fff-pct',
            'meeting_notification_template_subject' => 'pct-subject',
        ]);
        // Total: 18 rows

        // = exact match → 1
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '=', 'FTQ aaa 111'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('FTQ aaa 111', $data[0]['name']);

        // v% starts with "FTQ aaa" → 4
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'FTQ aaa'),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringStartsWith('FTQ aaa', $row['name']);
        }

        // %v ends with "111" scoped to FTQ prefix via AND → 4
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'FTQ'),
                self::filterColumn('name', '%v', '111'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('111', $row['name']);
        }

        // %v% contains "FTQ bbb" → 4
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'FTQ bbb'),
            'paging' => self::paging(50),
        ]), 4);

        // /v/ regexp: names starting with "FTQ a" or "FTQ c" → 8
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '/v/', '^FTQ [ac]'),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^FTQ [ac]/', $row['name']);
        }

        // lv literal pattern: "%100%" matches row containing "100" → 1 (FTQ fff 100%done)
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'lv', '%100%'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertStringContainsString('100', $data[0]['name']);

        // in operator: 3 specific names → 3
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'in', ['FTQ aaa 111', 'FTQ bbb 222', 'FTQ ccc 333']),
            'paging' => self::paging(50),
        ]), 3);
        $names = array_column($data, 'name');
        $this->assertContains('FTQ aaa 111', $names);
        $this->assertContains('FTQ bbb 222', $names);
        $this->assertContains('FTQ ccc 333', $names);

        // null on meetingNotificationTemplateSubject → 1
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name', 'meetingNotificationTemplateSubject'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'FTQ'),
                self::filterColumn('meetingNotificationTemplateSubject', 'null'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('FTQ eee null', $data[0]['name']);
        $this->assertNull($data[0]['meetingNotificationTemplateSubject']);

        // & AND: contains "FTQ aaa" AND url = "ftq-aaa-222" → 1
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name', 'url'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', '%v%', 'FTQ aaa'),
                self::filterColumn('url', '=', 'ftq-aaa-222'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('ftq-aaa-222', $data[0]['url']);

        // | OR: three exact names → 3
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('name', '=', 'FTQ aaa 111'),
                self::filterColumn('name', '=', 'FTQ bbb 111'),
                self::filterColumn('name', '=', 'FTQ ccc 111'),
            ]),
            'paging' => self::paging(50),
        ]), 3);

        // inverted filter: FTQ rows except aaa group → 14
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('name', 'v%', 'FTQ'),
                ['type' => 'column', 'column' => 'name', 'op' => '%v%', 'val' => 'FTQ aaa', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 14);

        // sort ascending on FTQ aaa rows: 111,222,333,444
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'FTQ aaa'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('FTQ aaa 111', $data[0]['name']);
        $this->assertEquals('FTQ aaa 222', $data[1]['name']);
        $this->assertEquals('FTQ aaa 333', $data[2]['name']);
        $this->assertEquals('FTQ aaa 444', $data[3]['name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', '%v%', 'FTQ aaa'),
            'sort' => [self::sort('name', desc: true)],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('FTQ aaa 444', $data[0]['name']);
        $this->assertEquals('FTQ aaa 111', $data[3]['name']);

        // pagination: 18 rows, page size 5 → 4 pages
        $page1 = $this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'FTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(18, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);

        $page4 = $this->tpiPost(self::URL, [
            'columns' => self::columns('id', 'name'),
            'filter' => self::filterColumn('name', 'v%', 'FTQ'),
            'sort' => [self::sort('name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 3);
        $this->assertNotEquals($page1['data'][0]['id'], $page4['data'][0]['id']);

        // distinct on meetingNotificationTemplateSubject within FTQ: 5 distinct values (aaa-subject, bbb-subject, ccc-subject, ddd-subject, pct-subject) + null
        $data = $this->assertTqueryData($this->tpiPost(self::URL, [
            'columns' => self::columns('meetingNotificationTemplateSubject', '_count'),
            'filter' => self::filterColumn('name', 'v%', 'FTQ'),
            'distinct' => true,
            'paging' => self::paging(50),
        ]));
        $this->assertGreaterThanOrEqual(5, count($data));
        foreach ($data as $row) {
            $this->assertArrayHasKey('_count', $row);
            $this->assertArrayHasKey('meetingNotificationTemplateSubject', $row);
        }
        // verify the groups that have 4 rows each get _count=4
        $subjects = array_column($data, 'meetingNotificationTemplateSubject');
        $this->assertContains('aaa-subject', $subjects);
        $countRows = array_values(array_filter($data, fn($r) => $r['meetingNotificationTemplateSubject'] === 'aaa-subject'));
        $this->assertEquals(4, $countRows[0]['_count']);
    }
}
