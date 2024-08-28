<?php

namespace App\Services\Meeting;

use App\Models\Meeting;
use App\Models\MeetingAttendant;
use Illuminate\Support\Facades\DB;

class MeetingCloneService
{
    public function clone(Meeting $meeting, array $dates, ?string $interval): array
    {
        $meeting->from_meeting_id ??= $meeting->id;
        $meeting->interval = $interval;

        // withoutRelations is clone, without relations which may save incorrectly
        $meetingWithoutRelations = $meeting->withoutRelations();
        $meetingWithoutRelations->resetStatus();
        $attendants = $meeting->attendants->map(function (MeetingAttendant $attendant): MeetingAttendant {
            $attendantCopy = $attendant->withoutRelations();
            $attendantCopy->resetAttendanceStatus();
            return $attendantCopy;
        });
        $resources = $meeting->resources->map(fn($resource) => $resource->withoutRelations());

        $ids = [];
        DB::transaction(
            function () use ($meeting, $dates, $meetingWithoutRelations, $attendants, $resources, &$ids) {
                $meeting->save();
                foreach ($dates as $date) {
                    $meetingCopy = $meetingWithoutRelations->replicate();
                    $meetingCopy->date = $date;
                    $meetingCopy->save();
                    $meetingCopy->attendants()->saveMany($attendants->map(fn($attendant) => $attendant->replicate()));
                    $meetingCopy->resources()->saveMany($resources->map(fn($resource) => $resource->replicate()));
                    $ids[] = $meetingCopy->id;
                }
            }
        );
        return $ids;
    }
}
