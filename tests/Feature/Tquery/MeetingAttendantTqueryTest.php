<?php

namespace Tests\Feature\Tquery;

use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;

/** AI-generated (Opus 4.6) */
class MeetingAttendantTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'AttendantTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/meeting/attendant/tquery";
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

    private function createStaffAttendant(Meeting $meeting, string $userName, int $order = 1): User
    {
        $user = User::factory()->create(['name' => $userName]);
        $staff = StaffMember::factory()->create();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'staff_member_id' => $staff->id,
        ]);
        $attendant = new MeetingAttendant();
        $attendant->fill([
            'meeting_id' => $meeting->id,
            'user_id' => $user->id,
            'attendance_type_dict_id' => AttendanceType::Staff->value,
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
        $this->assertContains('attendant.userId', $columnNames);
    }

    public function testQueries(): void
    {
        // 5 meetings × 4 attendants = 20 attendant rows
        // Meeting dates: 2030-03-01 to 2030-03-05
        // Attendant names: "ATQ aaa/bbb/ccc/ddd NNN" (NNN = meeting order 001-005)
        $meetings = [];
        for ($i = 1; $i <= 5; $i++) {
            $meetings[$i] = $this->createMeeting(sprintf('2030-03-%02d', $i));
        }

        foreach (['aaa', 'bbb', 'ccc', 'ddd'] as $order => $grp) {
            for ($i = 1; $i <= 5; $i++) {
                $this->createStaffAttendant($meetings[$i], "ATQ $grp " . sprintf('%03d', $i), $order + 1);
            }
        }
        // Total: 20 attendant rows (4 groups × 5 meetings)

        // = exact match on attendant.name → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '=', 'ATQ aaa 001'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('ATQ aaa 001', $data[0]['attendant.name']);

        // v% starts with "ATQ aaa" → 5 (one per meeting)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'ATQ aaa'),
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertStringStartsWith('ATQ aaa', $row['attendant.name']);
        }

        // %v ends with "003" → 4 (aaa/bbb/ccc/ddd 003)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('attendant.name', 'v%', 'ATQ'),
                self::filterColumn('attendant.name', '%v', '003'),
            ]),
            'paging' => self::paging(50),
        ]), 4);
        foreach ($data as $row) {
            $this->assertStringEndsWith('003', $row['attendant.name']);
        }

        // %v% contains "ATQ bbb" → 5
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '%v%', 'ATQ bbb'),
            'paging' => self::paging(50),
        ]), 5);

        // /v/ regexp: names matching "ATQ [ac]" → 10 (aaa + ccc groups)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '/v/', '^ATQ [ac]'),
            'paging' => self::paging(50),
        ]), 10);
        foreach ($data as $row) {
            $this->assertMatchesRegularExpression('/^ATQ [ac]/', $row['attendant.name']);
        }

        // in: 3 names → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'in', ['ATQ aaa 001', 'ATQ bbb 002', 'ATQ ccc 003']),
            'paging' => self::paging(50),
        ]), 3);

        // & AND: "ATQ ccc" AND date "2030-03-04" → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'attendant.name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('attendant.name', '%v%', 'ATQ ccc'),
                self::filterColumn('date', '=', '2030-03-04'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('ATQ ccc 004', $data[0]['attendant.name']);

        // | OR: aaa group OR date=2030-03-05 → 5+3=8 but aaa 005 is already in aaa, so 5+3=8 unique?
        // aaa group: 5 rows; date=2030-03-05: 4 rows (bbb,ccc,ddd 005 + aaa 005 already counted)
        // actually aaa 005 is in both, so 5+4-1=8 unique... wait let me reconsider
        // aaa: aaa 001,002,003,004,005 = 5
        // date=2030-03-05: aaa 005, bbb 005, ccc 005, ddd 005 = 4
        // union: aaa 001,002,003,004,005 + bbb 005, ccc 005, ddd 005 = 8
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name', 'date'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('attendant.name', '%v%', 'ATQ aaa'),
                self::filterColumn('date', '=', '2030-03-05'),
            ]),
            'paging' => self::paging(50),
        ]), 8);

        // inverted: ATQ rows except ddd group → 15
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('attendant.name', 'v%', 'ATQ'),
                ['type' => 'column', 'column' => 'attendant.name', 'op' => '%v%', 'val' => 'ATQ ddd', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 15);

        // sort ascending: ATQ aaa rows → 001,002,003,004,005
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '%v%', 'ATQ aaa'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(50),
        ]), 5);
        $this->assertEquals('ATQ aaa 001', $data[0]['attendant.name']);
        $this->assertEquals('ATQ aaa 005', $data[4]['attendant.name']);

        // sort descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', '%v%', 'ATQ aaa'),
            'sort' => [self::sort('attendant.name', desc: true)],
            'paging' => self::paging(50),
        ]), 5);
        $this->assertEquals('ATQ aaa 005', $data[0]['attendant.name']);
        $this->assertEquals('ATQ aaa 001', $data[4]['attendant.name']);

        // pagination: 20 rows, page size 5 → 4 pages
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'ATQ'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(20, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'attendant.name'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'ATQ'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 5);
        $this->assertNotEquals($page1['data'][0]['attendant.name'], $page4['data'][0]['attendant.name']);

        // distinct on date: 5 distinct dates each with 4 attendants
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('date', '_count'),
            'filter' => self::filterColumn('attendant.name', 'v%', 'ATQ'),
            'distinct' => true,
            'sort' => [self::sort('date')],
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertEquals(4, $row['_count']);
        }
        $this->assertEquals('2030-03-01', $data[0]['date']);
        $this->assertEquals('2030-03-05', $data[4]['date']);
    }
}
