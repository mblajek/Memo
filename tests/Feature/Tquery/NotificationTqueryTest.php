<?php

namespace Tests\Feature\Tquery;

use App\Models\Facility;
use App\Models\Notification;
use App\Models\User;

/** AI-generated (Opus 4.6) */
class NotificationTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'NotifTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/notification/tquery";
    }

    private function createNotification(string $subject, string $status = 'sent', string $service = 'email'): Notification
    {
        $notification = new Notification();
        $notification->fill([
            'facility_id' => $this->facility->id,
            'notification_method_dict_id' => '35a4c273-44b8-4039-a79f-391213973f58', // sms
            'subject' => $subject,
            'message' => "Message for $subject",
            'scheduled_at' => '2025-06-01 10:00:00',
            'service' => $service,
            'status' => $status,
        ]);
        $notification->created_by = User::SYSTEM;
        $notification->updated_by = User::SYSTEM;
        $notification->saveOrFail();
        return $notification;
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet($this->url);
        $this->assertArrayHasKey('columns', $config);
        $columnNames = array_column($config['columns'], 'name');
        $this->assertContains('id', $columnNames);
        $this->assertContains('subject', $columnNames);
        $this->assertContains('status', $columnNames);
        $this->assertContains('service', $columnNames);
    }

    public function testQueries(): void
    {
        // 16 rows: groups aaa/bbb/ccc/ddd × suffixes 111/222/333/444
        // status: sent for aaa/bbb, error for ccc/ddd
        // service: email for aaa/ccc, sms for bbb/ddd
        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $grp) {
            $status = in_array($grp, ['aaa', 'bbb']) ? 'sent' : 'error';
            $service = in_array($grp, ['aaa', 'ccc']) ? 'email' : 'sms';
            foreach (['111', '222', '333', '444'] as $sfx) {
                $this->createNotification("NTQ $grp $sfx", $status, $service);
            }
        }
        // Total: 16 rows

        // = exact match → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', '=', 'NTQ aaa 111'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('NTQ aaa 111', $data[0]['subject']);

        // v% starts with "NTQ aaa" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', 'v%', 'NTQ aaa'),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringStartsWith('NTQ aaa', $row['subject']);
        }

        // %v ends with "222" scoped to NTQ → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('subject', 'v%', 'NTQ'),
                self::filterColumn('subject', '%v', '222'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('222', $row['subject']);
        }

        // %v% contains "NTQ ccc" → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', '%v%', 'NTQ ccc'),
            'paging' => self::paging(50),
        ]), 4);

        // /v/ regexp: subjects matching "NTQ [bd]" → 8
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', '/v/', '^NTQ [bd]'),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^NTQ [bd]/', $row['subject']);
        }

        // in: 3 specific subjects → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', 'in', ['NTQ aaa 111', 'NTQ bbb 222', 'NTQ ddd 333']),
            'paging' => self::paging(50),
        ]), 3);
        $subjects = array_column($data, 'subject');
        $this->assertContains('NTQ aaa 111', $subjects);
        $this->assertContains('NTQ bbb 222', $subjects);
        $this->assertContains('NTQ ddd 333', $subjects);

        // = on status "sent" → 8 (aaa + bbb groups)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject', 'status'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('subject', 'v%', 'NTQ'),
                self::filterColumn('status', '=', 'sent'),
            ]),
            'paging' => self::paging(50),
        ]), 8);
        foreach ($data as $row) {
            $this->assertEquals('sent', $row['status']);
        }

        // = on status "error" → 8 (ccc + ddd groups)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject', 'status'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('subject', 'v%', 'NTQ'),
                self::filterColumn('status', '=', 'error'),
            ]),
            'paging' => self::paging(50),
        ]), 8);

        // & AND: NTQ bbb AND status=sent → 4
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject', 'status'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('subject', '%v%', 'NTQ bbb'),
                self::filterColumn('status', '=', 'sent'),
            ]),
            'paging' => self::paging(50),
        ]), 4);

        // | OR: NTQ aaa 111 OR NTQ ddd 444 → 2
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('subject', '=', 'NTQ aaa 111'),
                self::filterColumn('subject', '=', 'NTQ ddd 444'),
            ]),
            'paging' => self::paging(50),
        ]), 2);

        // inverted: NTQ rows except ccc group → 12
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('subject', 'v%', 'NTQ'),
                ['type' => 'column', 'column' => 'subject', 'op' => '%v%', 'val' => 'NTQ ccc', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 12);

        // sort ascending: NTQ aaa rows → 111,222,333,444
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', '%v%', 'NTQ aaa'),
            'sort' => [self::sort('subject')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('NTQ aaa 111', $data[0]['subject']);
        $this->assertEquals('NTQ aaa 222', $data[1]['subject']);
        $this->assertEquals('NTQ aaa 333', $data[2]['subject']);
        $this->assertEquals('NTQ aaa 444', $data[3]['subject']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', '%v%', 'NTQ aaa'),
            'sort' => [self::sort('subject', desc: true)],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals('NTQ aaa 444', $data[0]['subject']);
        $this->assertEquals('NTQ aaa 111', $data[3]['subject']);

        // pagination: 16 rows, page size 5 → 4 pages (last has 1)
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', 'v%', 'NTQ'),
            'sort' => [self::sort('subject')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(16, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']); // ceil(16/5)=4

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'subject'),
            'filter' => self::filterColumn('subject', 'v%', 'NTQ'),
            'sort' => [self::sort('subject')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 1);

        // distinct on status: 2 values (sent: 8, error: 8)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('status', '_count'),
            'filter' => self::filterColumn('subject', 'v%', 'NTQ'),
            'distinct' => true,
            'paging' => self::paging(50),
        ]), 2);
        foreach ($data as $row) {
            $this->assertArrayHasKey('_count', $row);
            $this->assertEquals(8, $row['_count']);
        }
    }
}
