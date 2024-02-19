<?php

namespace App\Services\Meeting;

use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\MeetingResource;
use App\Models\Position;
use App\Models\UuidEnum\PositionAttributeUuidEnum;
use Illuminate\Support\Facades\DB;

class MeetingService
{
    public function create(Facility $facility, array $data): string
    {
        $meeting = new Meeting($data);
        $meeting->facility_id = $facility->id;
        $this->fillMeetingCategory($meeting, $facility);

        $staff = $this->extractStaff($data) ?? [];
        $clients = $this->extractClients($data) ?? [];
        $attendants = array_merge($staff, $clients);
        $resources = $this->extractResources($data) ?? [];

        DB::transaction(function () use ($meeting, $attendants, $resources) {
            $meeting->save();
            $meeting->attendants()->saveMany($attendants);
            $meeting->resources()->saveMany($resources);
        });

        return $meeting->id;
    }

    public function patch(Meeting $meeting, array $data): void
    {
        $meeting->fill($data);
        $this->fillMeetingCategory($meeting);
        $meeting->interval = null;

        // TODO: Go through those list elements one by one to figure out which ones need to be added,
        //       updated, or deleted separately.
        $finalAttendants = $this->extractPatchAttendants($data, $meeting);
        $finalResources = $this->extractResources($data);

        DB::transaction(function () use ($meeting, $finalAttendants, $finalResources) {
            if ($meeting->isDirty()) {
                $meeting->save();
            }
            if (!is_null($finalAttendants)) {
                $meeting->attendants()->delete();
                $meeting->attendants()->saveMany($finalAttendants);
            }
            if (!is_null($finalResources)) {
                $meeting->resources()->delete();
                if (count($finalResources) > 0) {
                    $meeting->resources()->saveMany($finalResources);
                }
            }
        });
    }

    private function fillMeetingCategory(Meeting $meeting): void
    {
        $meeting->category_dict_id = (Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValues(byId: true)[PositionAttributeUuidEnum::Category->value]);
    }

    private function extract(array &$data, string $key)
    {
        if (!array_key_exists($key, $data)) {
            return null;
        }
        $dataKey = $data[$key];
        unset($data[$key]);
        return $dataKey;
    }

    private function extractStaff(array &$data): ?array
    {
        $attendants = [];
        $attendantsData = $this->extract($data, 'staff');
        if (is_null($attendantsData)) {
            return null;
        }
        foreach ($attendantsData as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $attendant->attendance_type = AttendanceType::Staff;
            $attendants[$attendant->user_id] = $attendant;
        }
        return array_values($attendants);
    }

    private function extractClients(array &$data): ?array
    {
        $attendants = [];
        $attendantsData = $this->extract($data, 'clients');
        if (is_null($attendantsData)) {
            return null;
        }
        foreach ($attendantsData as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $attendant->attendance_type = AttendanceType::Client;
            $attendants[$attendant->user_id] = $attendant;
        }
        return array_values($attendants);
    }

    private function extractResources(array &$data): ?array
    {
        $resources = [];
        $resourcesData = $this->extract($data, 'resources');
        if (is_null($resourcesData)) {
            return null;
        }
        foreach ($resourcesData as $resourceData) {
            $resource = new MeetingResource($resourceData);
            $resources[$resource->resource_dict_id] = $resource;
        }
        return array_values($resources);
    }

    public function extractPatchAttendants(array &$data, Meeting $meeting): ?array
    {
        $newStaff = $this->extractStaff($data);
        $newClients = $this->extractClients($data);

        if (is_null($newStaff) && is_null($newClients)) {
            return null;
        }

        $finalStaff = $newStaff ?? $meeting->getAttendants(AttendanceType::Staff);
        $finalClients = $newClients ?? $meeting->getAttendants(AttendanceType::Client);

        return array_merge($finalStaff, $finalClients);
    }
}
