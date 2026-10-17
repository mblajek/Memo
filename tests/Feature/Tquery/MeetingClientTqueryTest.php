<?php

namespace Tests\Feature\Tquery;

use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\GroupClient;
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
        $this->prepareFacilityAdmin($this->facility, globalAdmin: true, facilityStaff: true);
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

    private function createClientAttendant(
        Meeting $meeting,
        string $userName,
        int $order = 1,
        ?Facility $clientFacility = null,
        string $shortCode = '-',
    ): User {
        $clientFacility ??= $this->facility;
        $user = User::factory()->create(['name' => $userName]);
        $client = new Client();
        $client->user_id = $user->id;
        $client->facility_id = $clientFacility->id;
        $client->short_code = $shortCode;
        $client->type_dict_id = 'd1c57dfc-c118-49ff-ae38-6585645349ca'; // adult
        $client->saveOrFail();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $clientFacility->id,
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

    public function testNullFilterOnListColumns(): void
    {
        $this->createClientAttendant($this->createMeeting('2030-05-01'), 'Null Filter User');
        $this->assertSame([
            'attendants.*.name' => [0, 1],
            'attendants' => [0, 1],
            'clients.*.name' => [0, 1],
            'clients' => [0, 1],
            'staff.*.name' => [1, 0],
            'staff' => [1, 0],
            'resources' => [1, 0],
            'client.documentsLinks' => [1, 0],
        ], $this->listColumnsNullFilterCounts(
            $this->url,
            self::filterColumn('date', '=', '2030-05-01'),
        ));
    }

    public function testListsAttendancesOfUsersNoLongerClientsOfTheFacility(): void
    {
        $meeting = $this->createMeeting('2030-06-01');
        $current = $this->createClientAttendant($meeting, 'MCO current', 1);
        // the client role removed, the membership kept (e.g. a staff member)
        $roleRemoved = $this->createClientAttendant($meeting, 'MCO role removed', 2);
        $roleRemovedMember = Member::query()->where('user_id', $roleRemoved->id)->firstOrFail();
        $roleRemovedMember->client->delete();
        // the membership removed
        $memberRemoved = $this->createClientAttendant($meeting, 'MCO member removed', 3);
        $member = Member::query()->where('user_id', $memberRemoved->id)->firstOrFail();
        $client = $member->client;
        $member->delete();
        $client->delete();
        // a client of another facility only
        $otherFacility = Facility::factory()->create(['name' => 'MeetClientTQ Other Facility']);
        $otherClient = $this->createClientAttendant($meeting, 'MCO other facility', 4, $otherFacility, 'OTHER');

        $response = $this->tpiPost($this->url, [
            'columns' => self::columns('attendant.userId', 'member.id', 'client.createdAt', 'client.shortCode'),
            'filter' => self::filterColumn('date', '=', '2030-06-01'),
            'sort' => [self::sort('attendant.name')],
            'paging' => self::paging(50),
        ]);
        $this->assertSame(4, $response['meta']['totalDataSize']);
        $rows = array_column($response['data'], null, 'attendant.userId');
        $this->assertSame(
            [$current->id, $memberRemoved->id, $otherClient->id, $roleRemoved->id],
            array_column($response['data'], 'attendant.userId'),
        );
        $this->assertNotNull($rows[$current->id]['member.id']);
        $this->assertNotNull($rows[$current->id]['client.createdAt']);
        $this->assertSame('-', $rows[$current->id]['client.shortCode']);
        $this->assertSame($roleRemovedMember->id, $rows[$roleRemoved->id]['member.id']);
        foreach ([$roleRemoved, $memberRemoved, $otherClient] as $user) {
            $this->assertNull($rows[$user->id]['client.createdAt']);
            $this->assertNull($rows[$user->id]['client.shortCode']);
        }
        $this->assertNull($rows[$memberRemoved->id]['member.id']);
        $this->assertNull($rows[$otherClient->id]['member.id']);

        // only the groups of this facility are shown
        $groupMate = User::factory()->create();
        $group = ClientGroup::query()->create(['facility_id' => $this->facility->id]);
        $otherGroup = ClientGroup::query()->create(['facility_id' => $otherFacility->id]);
        $groupMemberships = [
            [$group, $current],
            [$group, $groupMate],
            [$otherGroup, $otherClient],
            [$otherGroup, $groupMate],
        ];
        foreach ($groupMemberships as [$g, $user]) {
            GroupClient::query()->create(['client_group_id' => $g->id, 'user_id' => $user->id, 'role' => 'member']);
        }
        $groupColumns = [
            'client.groups.count', 'client.groups.*.id', 'client.groups.*.role', 'client.groups.*.clients.*.userId',
        ];
        $rows = array_column($this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('attendant.userId', ...$groupColumns),
            'filter' => self::filterColumn('date', '=', '2030-06-01'),
            'paging' => self::paging(50),
        ]), 4), null, 'attendant.userId');
        $this->assertSame(
            [1, [$group->id], ['member'], [$groupMate->id]],
            array_map(fn($column) => $rows[$current->id][$column], $groupColumns),
        );
        $this->assertSame(
            [0, [], [], []],
            array_map(fn($column) => $rows[$otherClient->id][$column], $groupColumns),
        );

        // the client columns are nullable, so inverted filters keep the rows without client data
        $data = $this->assertTqueryData($this->tpiPost($this->url, [
            'columns' => self::columns('attendant.userId'),
            'filter' => self::filterGroup('&', [
                self::filterColumn('date', '=', '2030-06-01'),
                [
                    'type' => 'column',
                    'column' => 'client.typeDictId',
                    'op' => '=',
                    'val' => 'd1c57dfc-c118-49ff-ae38-6585645349ca',
                    'inv' => true,
                ],
            ]),
            'paging' => self::paging(50),
        ]), 3);
        $this->assertNotContains($current->id, array_column($data, 'attendant.userId'));
        foreach (['member.id' => 2, 'client.createdAt' => 3] as $column => $nullCount) {
            $this->assertSame($nullCount, $this->tpiPost($this->url, [
                'columns' => self::columns('id'),
                'filter' => self::filterGroup('&', [
                    self::filterColumn('date', '=', '2030-06-01'),
                    self::filterColumn($column, 'null'),
                ]),
                'paging' => self::paging(1),
            ])['meta']['totalDataSize'], $column);
        }
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
        $nullable = array_column($config['columns'], 'nullable', 'name');
        $this->assertTrue($nullable['client.createdAt']);
        $this->assertFalse($nullable['client.urgentNotes.count']);
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
