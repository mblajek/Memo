<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\GroupClient;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class ClientGroupAssignToAttendantsTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility, facilityStaff: true, developer: true);
    }

    private function createClient(): User
    {
        $user = User::factory()->create();
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

    private function createGroup(?User $client = null): ClientGroup
    {
        $group = ClientGroup::query()->create(['facility_id' => $this->facility->id]);
        if ($client) {
            GroupClient::query()->create(['client_group_id' => $group->id, 'user_id' => $client->id]);
        }
        return $group;
    }

    private function createAttendance(User $client, ?ClientGroup $group, ?Facility $facility = null): MeetingAttendant
    {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => ($facility ?? $this->facility)->id,
            'date' => '2030-05-01',
            'start_dayminute' => 600,
            'duration_minutes' => 60,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => '137205e2-e9a1-4f8f-ada2-555319506b28',
            'type_dict_id' => '6e87acd5-70a0-4051-963b-42d439f44e42',
            'is_remote' => false,
        ]);
        $meeting->saveOrFail();
        $attendant = new MeetingAttendant();
        $attendant->fill([
            'meeting_id' => $meeting->id,
            'user_id' => $client->id,
            'attendance_type_dict_id' => AttendanceType::Client->value,
            'attendance_status_dict_id' => MeetingAttendant::ATTENDANCE_STATUS_OK,
            'client_group_id' => $group?->id,
            'default_order' => 1,
        ]);
        $attendant->saveOrFail();
        return $attendant;
    }

    public function testReplaceAllAlsoAssignsAttendancesWithoutGroup(): void
    {
        $client = $this->createClient();
        $group = $this->createGroup($client);
        $otherGroup = $this->createGroup();
        $withoutGroup = $this->createAttendance($client, null);
        $withOtherGroup = $this->createAttendance($client, $otherGroup);
        $withSameGroup = $this->createAttendance($client, $group);
        $otherClient = $this->createClient();
        $otherFacility = Facility::factory()->create();
        $untouched = [
            $this->createAttendance($otherClient, null),
            $this->createAttendance($otherClient, $otherGroup),
            $this->createAttendance($client, null, $otherFacility),
            $this->createAttendance($client, $otherGroup, $otherFacility),
        ];

        $result = $this->post("/api/v1/facility/{$this->facility->id}/client-group/assign-to-attendants", [
            'clientUserId' => $client->id,
            'clientGroupId' => $group->id,
            'replaceAll' => true,
        ]);

        $result->assertOk();
        $this->assertSame([['userId' => $client->id, 'updateCount' => 2]], $result->json('data.updated'));
        foreach ([$withoutGroup, $withOtherGroup, $withSameGroup] as $attendant) {
            $this->assertSame($group->id, $attendant->refresh()->client_group_id);
        }
        foreach ($untouched as $attendant) {
            $this->assertSame($attendant->client_group_id, $attendant->refresh()->client_group_id);
        }
    }
}
