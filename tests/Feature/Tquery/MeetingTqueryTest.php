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
class MeetingTqueryTest extends TqueryTestCase
{
    private Facility $facility;
    private string $url;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create(['name' => 'MeetingTQ Facility']);
        $this->prepareFacilityAdmin($this->facility);
        $this->url = "/api/v1/facility/{$this->facility->id}/meeting/tquery";
    }

    private function createMeeting(
        string $date,
        int $startDayminute = 600,
        int $duration = 60,
        bool $isRemote = false,
        ?string $notes = null,
    ): Meeting {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => $this->facility->id,
            'date' => $date,
            'start_dayminute' => $startDayminute,
            'duration_minutes' => $duration,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => '137205e2-e9a1-4f8f-ada2-555319506b28', // 'other' category
            'type_dict_id' => '6e87acd5-70a0-4051-963b-42d439f44e42', // 'other' type
            'is_remote' => $isRemote,
            'notes' => $notes,
        ]);
        $meeting->created_by = User::SYSTEM;
        $meeting->updated_by = User::SYSTEM;
        $meeting->saveOrFail();
        return $meeting;
    }

    private function addStaffAttendant(Meeting $meeting, int $order = 1): User
    {
        $user = User::factory()->create();
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
        $this->assertContains('startDayminute', $columnNames);
        $this->assertContains('durationMinutes', $columnNames);
        $this->assertContains('isRemote', $columnNames);
    }

    public function testQueries(): void
    {
        // 20 meetings on dates 2030-01-01 to 2030-01-20
        // durationMinutes: 30 for days 1-5, 60 for days 6-10, 90 for days 11-15, 120 for days 16-20
        // isRemote: true for days 1-5, false for days 6-20
        // notes: 'ERR-001 code' for day 1, '100% done' for day 2, null for days 3-20
        for ($i = 1; $i <= 20; $i++) {
            $date = sprintf('2030-01-%02d', $i);
            $duration = match (true) {
                $i <= 5 => 30,
                $i <= 10 => 60,
                $i <= 15 => 90,
                default => 120,
            };
            $notes = match ($i) {
                1 => 'ERR-001 code',
                2 => '100% done',
                default => null,
            };
            $this->createMeeting($date, startDayminute: 600, duration: $duration, isRemote: $i <= 5, notes: $notes);
        }
        // Total: 20 meetings

        // = date exact → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterColumn('date', '=', '2030-01-05'),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-01-05', $data[0]['date']);

        // in: 3 dates → 3
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterColumn('date', 'in', ['2030-01-01', '2030-01-10', '2030-01-20']),
            'paging' => self::paging(50),
        ]), 3);
        $dates = array_column($data, 'date');
        $this->assertContains('2030-01-01', $dates);
        $this->assertContains('2030-01-10', $dates);
        $this->assertContains('2030-01-20', $dates);

        // > date 2030-01-15 → 5 (days 16-20)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('date', '>', '2030-01-15'),
            ]),
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertGreaterThan('2030-01-15', $row['date']);
        }

        // <= date 2030-01-05 → 5 (days 1-5)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('date', '<=', '2030-01-05'),
            ]),
            'paging' => self::paging(50),
        ]), 5);

        // date range: days 6-15 → 10
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-06'),
                self::filterColumn('date', '<=', '2030-01-15'),
            ]),
            'paging' => self::paging(50),
        ]), 10);

        // > durationMinutes 90 → 5 (days 16-20 with duration=120)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'durationMinutes'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('durationMinutes', '>', 90),
            ]),
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertGreaterThan(90, $row['durationMinutes']);
        }

        // < durationMinutes 60 → 5 (days 1-5 with duration=30)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'durationMinutes'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('durationMinutes', '<', 60),
            ]),
            'paging' => self::paging(50),
        ]), 5);

        // = isRemote true → 5 (days 1-5)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'isRemote'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('isRemote', '=', true),
            ]),
            'paging' => self::paging(50),
        ]), 5);
        foreach ($data as $row) {
            $this->assertTrue($row['isRemote']);
        }

        // null on notes → 18 (days 3-20)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('notes', 'null'),
            ]),
            'paging' => self::paging(50),
        ]), 18);

        // /v/ regexp on notes: 'ERR-[0-9]+' → 1 (day 1)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'notes'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('notes', '/v/', 'ERR-[0-9]+'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-01-01', $data[0]['date']);
        $this->assertMatchesRegularExpression('/ERR-[0-9]+/', $data[0]['notes']);

        // lv literal: '%100%' matches notes containing "100" → 1 (day 2)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'notes'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                self::filterColumn('notes', 'lv', '%100%'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-01-02', $data[0]['date']);
        $this->assertStringContainsString('100', $data[0]['notes']);

        // | OR: day 1 OR day 20 → 2
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('|', [
                self::filterColumn('date', '=', '2030-01-01'),
                self::filterColumn('date', '=', '2030-01-20'),
            ]),
            'paging' => self::paging(50),
        ]), 2);

        // inverted: days 1-20 except remote (days 1-5) → 15
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '>=', '2030-01-01'),
                ['type' => 'column', 'column' => 'isRemote', 'op' => '=', 'val' => true, 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 15);

        // sort date ascending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterColumn('date', 'in', ['2030-01-03', '2030-01-01', '2030-01-02']),
            'sort' => [self::sort('date')],
            'paging' => self::paging(50),
        ]), 3);
        $this->assertEquals('2030-01-01', $data[0]['date']);
        $this->assertEquals('2030-01-02', $data[1]['date']);
        $this->assertEquals('2030-01-03', $data[2]['date']);

        // sort date descending
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterColumn('date', 'in', ['2030-01-03', '2030-01-01', '2030-01-02']),
            'sort' => [self::sort('date', desc: true)],
            'paging' => self::paging(50),
        ]), 3);
        $this->assertEquals('2030-01-03', $data[0]['date']);
        $this->assertEquals('2030-01-01', $data[2]['date']);

        // sort by durationMinutes ascending: 5×30, 5×60, 5×90, 5×120
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'durationMinutes'),
            'filter' => self::filterColumn('date', '>=', '2030-01-01'),
            'sort' => [self::sort('durationMinutes'), self::sort('date')],
            'paging' => self::paging(50),
        ]), 20);
        $this->assertEquals(30, $data[0]['durationMinutes']);
        $this->assertEquals(120, $data[19]['durationMinutes']);

        // pagination: 20 rows, page size 5 → 4 pages
        $page1 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterColumn('date', '>=', '2030-01-01'),
            'sort' => [self::sort('date')],
            'paging' => self::paging(5, 1),
        ]);
        $this->assertTqueryData($page1, 5);
        $this->assertEquals(20, $page1['meta']['totalDataSize']);
        $this->assertEquals(4, $page1['meta']['totalDataPages']);
        $this->assertEquals('2030-01-01', $page1['data'][0]['date']);

        $page4 = $this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterColumn('date', '>=', '2030-01-01'),
            'sort' => [self::sort('date')],
            'paging' => self::paging(5, 4),
        ]);
        $this->assertTqueryData($page4, 5);
        $this->assertEquals('2030-01-16', $page4['data'][0]['date']);

        // distinct on durationMinutes: 4 distinct values (30,60,90,120) each with _count=5
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('durationMinutes', '_count'),
            'filter' => self::filterColumn('date', '>=', '2030-01-01'),
            'distinct' => true,
            'sort' => [self::sort('durationMinutes')],
            'paging' => self::paging(50),
        ]), 4);
        $this->assertEquals(30, $data[0]['durationMinutes']);
        $this->assertEquals(5, $data[0]['_count']);
        $this->assertEquals(120, $data[3]['durationMinutes']);
        $this->assertEquals(5, $data[3]['_count']);
    }

    public function testListFilters(): void
    {
        // Create 5 meetings, each with 0-2 attendants
        $m0 = $this->createMeeting('2030-02-01'); // no attendants
        $m1 = $this->createMeeting('2030-02-02');
        $user1 = $this->addStaffAttendant($m1, 1);

        $m2 = $this->createMeeting('2030-02-03');
        $user2 = $this->addStaffAttendant($m2, 1);

        $m3 = $this->createMeeting('2030-02-04');
        $user1b = $this->addStaffAttendant($m3, 1); // user1b is different from user1
        $user2b = $this->addStaffAttendant($m3, 2); // user2b different from user2

        $m4 = $this->createMeeting('2030-02-05');
        $user1c = $this->addStaffAttendant($m4, 1); // unique user
        $user2c = $this->addStaffAttendant($m4, 2); // unique user
        $user3 = $this->addStaffAttendant($m4, 3); // extra attendant

        $dateFilter = self::filterColumn('date', 'in', [
            '2030-02-01', '2030-02-02', '2030-02-03', '2030-02-04', '2030-02-05',
        ]);

        // null on attendants.*.userId → 1 (m0 has no attendants)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                $dateFilter,
                self::filterColumn('attendants.*.userId', 'null'),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-02-01', $data[0]['date']);

        // not null (inv) → 4 (m1,m2,m3,m4)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                $dateFilter,
                ['type' => 'column', 'column' => 'attendants.*.userId', 'op' => 'null', 'inv' => true],
            ]),
            'paging' => self::paging(50),
        ]), 4);

        // has user1 → 1 (m1)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date', 'attendants.*.userId'),
            'filter' => self::filterGroup('&', [
                $dateFilter,
                self::filterColumn('attendants.*.userId', 'has', $user1->id),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-02-02', $data[0]['date']);
        $this->assertContains($user1->id, $data[0]['attendants.*.userId']);

        // has user1 OR user2 via has_any → 2 (m1, m2)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                $dateFilter,
                self::filterColumn('attendants.*.userId', 'has_any', [$user1->id, $user2->id]),
            ]),
            'paging' => self::paging(50),
        ]), 2);
        $dates = array_column($data, 'date');
        $this->assertContains('2030-02-02', $dates);
        $this->assertContains('2030-02-03', $dates);

        // has_all: m3 has user1b AND user2b → 1
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                $dateFilter,
                self::filterColumn('attendants.*.userId', 'has_all', [$user1b->id, $user2b->id]),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-02-04', $data[0]['date']);

        // has_only: m1 has only user1 → has_only([user1]) = true
        // Use specific date filter excluding m0 (empty list is also a subset, avoid ambiguity)
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('id', 'date'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', 'in', ['2030-02-02', '2030-02-03', '2030-02-04', '2030-02-05']),
                self::filterColumn('attendants.*.userId', 'has_only', [$user1->id]),
            ]),
            'paging' => self::paging(50),
        ]), 1);
        $this->assertEquals('2030-02-02', $data[0]['date']);
    }
}
