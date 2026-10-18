<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class MeetingSeriesFacilityScopeTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const string MEETING_TYPE = '6e87acd5-70a0-4051-963b-42d439f44e42';

    private Facility $facility;
    private Facility $otherFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create();
        $this->otherFacility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility, facilityStaff: true);
    }

    private function createMeeting(Facility $facility, ?Meeting $series = null): Meeting
    {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => $facility->id,
            'date' => '2030-05-01',
            'start_dayminute' => 600,
            'duration_minutes' => 60,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => '137205e2-e9a1-4f8f-ada2-555319506b28',
            'type_dict_id' => self::MEETING_TYPE,
            'is_remote' => false,
        ]);
        $meeting->created_by = User::SYSTEM;
        $meeting->updated_by = User::SYSTEM;
        $meeting->saveOrFail();
        if ($series) {
            $meeting->from_meeting_id = $series->id;
            $meeting->saveOrFail();
        }
        return $meeting;
    }

    private function postMeeting(string $fromMeetingId): TestResponse
    {
        return $this->post("/api/v1/facility/{$this->facility->id}/meeting", [
            'typeDictId' => self::MEETING_TYPE,
            'date' => '2030-05-08',
            'startDayminute' => 600,
            'durationMinutes' => 60,
            'statusDictId' => Meeting::STATUS_PLANNED,
            'isRemote' => false,
            'fromMeetingId' => $fromMeetingId,
        ]);
    }

    public function testCreatesMeetingInSeriesOfThisFacility(): void
    {
        $meeting = $this->createMeeting($this->facility);

        $id = $this->postMeeting($meeting->id)->assertCreated()->json('data.id');

        $this->assertSame($meeting->id, $meeting->refresh()->from_meeting_id);
        $this->assertSame($meeting->id, Meeting::query()->findOrFail($id)->from_meeting_id);
    }

    public function testRejectsSeriesOfOtherFacility(): void
    {
        $otherMeeting = $this->createMeeting($this->otherFacility);
        $meetingCount = Meeting::query()->count();

        $this->postMeeting($otherMeeting->id)
            ->assertBadRequest()
            ->assertJsonFragment(['field' => 'fromMeetingId', 'code' => 'validation.exists']);

        $this->assertNull($otherMeeting->refresh()->from_meeting_id);
        $this->assertSame($meetingCount, Meeting::query()->count());
    }

    public function testSeriesDeleteLeavesOtherFacilityAlone(): void
    {
        $first = $this->createMeeting($this->facility);
        $first->from_meeting_id = $first->id;
        $first->saveOrFail();
        $second = $this->createMeeting($this->facility, series: $first);
        // A series reaching another facility, as could have been made before the series was scoped.
        $otherMeeting = $this->createMeeting($this->otherFacility, series: $first);

        $this->delete("/api/v1/facility/{$this->facility->id}/meeting/{$second->id}", ['series' => 'all'])
            ->assertOk()
            ->assertJsonPath('data.count', 2);

        $this->assertNull(Meeting::query()->find($first->id));
        $this->assertNull(Meeting::query()->find($second->id));
        $this->assertNotNull(Meeting::query()->find($otherMeeting->id));
    }
}
