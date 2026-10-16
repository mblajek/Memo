<?php

namespace Tests\Feature;

use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class MeetingConflictsTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private Facility $facility;
    private string $url;
    private User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility, facilityStaff: true);
        $this->url = "/api/v1/facility/{$this->facility->id}/meeting/conflicts";
        $this->staffUser = User::factory()->create();
        Member::factory()->create([
            'user_id' => $this->staffUser->id,
            'facility_id' => $this->facility->id,
            'staff_member_id' => StaffMember::factory()->create()->id,
        ]);
    }

    private function createStaffMeeting(string $date, int $startDayminute, int $duration): Meeting
    {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => $this->facility->id,
            'date' => $date,
            'start_dayminute' => $startDayminute,
            'duration_minutes' => $duration,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => '137205e2-e9a1-4f8f-ada2-555319506b28', // 'other' category
            'type_dict_id' => '6e87acd5-70a0-4051-963b-42d439f44e42', // 'other' type
            'is_remote' => false,
        ]);
        $meeting->created_by = User::SYSTEM;
        $meeting->updated_by = User::SYSTEM;
        $meeting->saveOrFail();
        $attendant = new MeetingAttendant();
        $attendant->fill([
            'meeting_id' => $meeting->id,
            'user_id' => $this->staffUser->id,
            'attendance_type_dict_id' => AttendanceType::Staff->value,
            'attendance_status_dict_id' => MeetingAttendant::ATTENDANCE_STATUS_OK,
            'default_order' => 1,
        ]);
        $attendant->saveOrFail();
        return $meeting;
    }

    private function staffConflicts(array ...$samples): array
    {
        $result = $this->post($this->url, [
            'samples' => array_map(fn(array $sample) => array_combine(
                ['date', 'startDayminute', 'durationMinutes'],
                $sample,
            ), $samples),
            'staff' => true,
        ]);
        $result->assertOk();
        return array_column($result->json('data'), 'staff');
    }

    public function testFindsMeetingFromThePreviousDayCrossingMidnight(): void
    {
        $meeting = $this->createStaffMeeting('2030-01-01', startDayminute: 23 * 60, duration: 120);

        $this->assertSame([
            [['id' => $this->staffUser->id, 'meetingIds' => [$meeting->id]]],
            [],
        ], $this->staffConflicts(['2030-01-02', 30, 60], ['2030-01-02', 60, 60]));
    }

    public function testFindsMeetingFromTheNextDayWhenTheSampleCrossesMidnight(): void
    {
        $meeting = $this->createStaffMeeting('2030-01-02', startDayminute: 0, duration: 60);

        $this->assertSame([
            [['id' => $this->staffUser->id, 'meetingIds' => [$meeting->id]]],
            [],
        ], $this->staffConflicts(['2030-01-01', 23 * 60 + 30, 60], ['2030-01-01', 23 * 60, 60]));
    }
}
