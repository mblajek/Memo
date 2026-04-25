<?php

namespace Tests\Feature\Tquery;

use App\Models\Client;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\User;

/** AI-generated (Opus 4.6) */
class MeetingClientTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'MeetClientTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/meeting/client/tquery";
    }

    private function createMeeting(string $date): Meeting
    {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => $this->facility->id,
            'date' => $date,
            'start_dayminute' => 600,
            'duration_minutes' => 60,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => '137205e2-e9a1-4f8f-ada2-555319506b28',
            'type_dict_id' => '6e87acd5-70a0-4051-963b-42d439f44e42',
            'is_remote' => false,
        ]);
        $meeting->created_by = User::SYSTEM;
        $meeting->updated_by = User::SYSTEM;
        $meeting->saveOrFail();
        return $meeting;
    }

    private function createClientAttendant(Meeting $meeting, string $userName, int $order = 1): User
    {
        $user = User::factory()->create(['name' => $userName]);
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
        $attendant = new MeetingAttendant();
        $attendant->fill([
            'meeting_id' => $meeting->id,
            'user_id' => $user->id,
            'attendance_type_dict_id' => AttendanceType::Client->value,
            'attendance_status_dict_id' => MeetingAttendant::ATTENDANCE_STATUS_OK,
            'default_order' => $order,
        ]);
        $attendant->saveOrFail();
        return $user;
    }

    public function testGetConfig(): void
    {
        $config = $this->tpiGet($this->url);
        $this->assertArrayHasKey('columns', $config);
        $columnNames = array_column($config['columns'], 'name');
        $this->assertContains('id', $columnNames);
        $this->assertContains('date', $columnNames);
        $this->assertContains('attendant.name', $columnNames);
        $this->assertContains('member.id', $columnNames);
    }

    public function testQueries(): void
    {
        // 5 meetings × 4 clients = 20 client-attendant rows
        // Meeting dates: 2030-04-01 to 2030-04-05
        // Client names: "MCQ aaa/bbb/ccc/ddd NNN" (NNN = meeting order 001-005)
        $meetings = [];
        for ($i = 1; $i <= 5; $i++) {
            $meetings[$i] = $this->createMeeting(sprintf('2030-04-%02d', $i));
        }

        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $order => $grp) {
            for ($i = 1; $i <= 5; $i++) {
                $this->createClientAttendant($meetings[$i], "MCQ $grp " . sprintf('%03d', $i), $order + 1);
            }
        }
        // Total: 20 client-attendant rows (4 groups × 5 meetings)

        // = exact match on attendant.name → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '=', 'MCQ aaa 001'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('MCQ aaa 001', $data[0]['attendant.name']);

        // v% starts with "MCQ aaa" → 5
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'MCQ aaa'),
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertStringStartsWith('MCQ aaa', $row['attendant.name']);
        }

        // %v ends with "002" → 4 (aaa/bbb/ccc/ddd 002)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('attendant.name', 'v%', 'MCQ'),
                self::filterColumn('attendant.name', '%v', '002'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('002', $row['attendant.name']);
        }

        // %v% contains "MCQ ccc" → 5
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '%v%', 'MCQ ccc'),
            'paging' => self::paging(50),
        ]), 5);

        // /v/ regexp: names matching "MCQ [bd]" → 10
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '/v/', '^MCQ [bd]'),
            'paging' => self::paging(50),
        ]), 10);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^MCQ [bd]/', $row['attendant.name']);
        }

        // in: 3 names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'in', ['MCQ aaa 001', 'MCQ bbb 003', 'MCQ ddd 005']),
            'paging' => self::paging(50),
        ]), 3);
        $names = array_column($data, 'attendant.name');
        $this->assertContains('MCQ aaa 001', $names);
        $this->assertContains('MCQ bbb 003', $names);
        $this->assertContains('MCQ ddd 005', $names);

        // & AND: "MCQ bbb" AND date "2030-04-03" → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'attendant.name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('attendant.name', '%v%', 'MCQ bbb'),
                self::filterColumn('date', '=', '2030-04-03'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('MCQ bbb 003', $data[0]['attendant.name']);

        // | OR: "MCQ aaa" OR date=2030-04-05 → aaa(5) + 005s not in aaa(3) = 8
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name', 'date'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('attendant.name', '%v%', 'MCQ aaa'),
                self::filterColumn('date', '=', '2030-04-05'),
            ]),
            'paging' => self::paging(50),
        ]), 8);

        // inverted: MCQ rows except ccc group → 15
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('attendant.name', 'v%', 'MCQ'),
                ['type' => 'column', 'column' => 'attendant.name', 'op' => '%v%', 'val' => 'MCQ ccc', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 15);

        // sort ascending: MCQ bbb rows → 001,002,003,004,005
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '%v%', 'MCQ bbb'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(50),
        ]), 5);
        $this->assertEquals('MCQ bbb 001', $data[0]['attendant.name']);
        $this->assertEquals('MCQ bbb 005', $data[4]['attendant.name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '%v%', 'MCQ bbb'),
            'sort' => [self::sort('attendant.name', desc: true)],
            'paging' => self::paging(50),
        ]), 5);
        $this->assertEquals('MCQ bbb 005', $data[0]['attendant.name']);
        $this->assertEquals('MCQ bbb 001', $data[4]['attendant.name']);

        // pagination: 20 rows, page size 5 → 4 pages
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'MCQ'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(20, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'MCQ'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 5);
        $this->assertNotEquals($page1['data'][0]['attendant.name'], $page4['data'][0]['attendant.name']);

        // distinct on date: 5 distinct dates each with 4 clients
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('date', '_count'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'MCQ'),
            'distinct' => true,
            'sort' => [self::sort('date')],
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertEquals(4, $row['_count']);
        }
        $this->assertEquals('2030-04-01', $data[0]['date']);
        $this->assertEquals('2030-04-05', $data[4]['date']);
    }
}
