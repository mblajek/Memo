<?php

namespace App\Services\Meeting;

use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Position;
use App\Models\UuidEnum\PositionAttributeUuidEnum;

class MeetingService
{
    public function create(Facility $facility, array $data): string
    {
        $attendantsData = $data['attendants'] ?? null;
        unset($data['attendants']);

        $meeting = new Meeting($data);
        $this->fillMeeting($meeting, $facility);

        foreach ($attendantsData as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $this->fillAttendant($attendant, $meeting);
        }

        $meeting->saveOrApiFail();
        return $meeting->id;
    }

    private function fillMeeting(Meeting $meeting, Facility $facility): void
    {
        $meeting->facility_id = $facility->id;
        $meeting->category_dict_id = (Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValues(byId: true)[PositionAttributeUuidEnum::category->value]);
    }

    private function fillAttendant(MeetingAttendant $attendant, Meeting $meeting): void
    {
    }
}
