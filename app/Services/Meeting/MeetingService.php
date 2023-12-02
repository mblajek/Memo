<?php

namespace App\Services\Meeting;

use App\Models\Facility;
use App\Models\Meeting;
use App\Models\Position;
use App\Models\UuidEnum\PositionAttributeUuidEnum;

class MeetingService
{
    public function create(Facility $facility, array $data): string
    {
        $meeting = new Meeting($data);
        $this->fill($facility, $meeting);
        $meeting->saveOrApiFail();
        return $meeting->id;
    }

    private function fill(Facility $facility, Meeting $meeting): void
    {
        $meeting->facility_id = $facility->id;
        $meeting->category_dict_id = (Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValues(byId: true)[PositionAttributeUuidEnum::category->value]);
    }
}
