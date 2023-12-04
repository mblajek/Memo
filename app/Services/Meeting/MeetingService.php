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
        $this->fillMeeting($meeting, $facility);

        $staff = $this->extractStaff($data);
        $clients = $this->extractClients($data);
        $attendants = array_merge($staff, $clients);
        $resources = $this->extractResources($data);

        DB::transaction(function () use ($meeting, $attendants, $resources) {
            $meeting->save();
            $meeting->attendants()->saveMany($attendants);
            $meeting->resources()->saveMany($resources);
        });

        return $meeting->id;
    }

    private function fillMeeting(Meeting $meeting, Facility $facility): void
    {
        $meeting->facility_id = $facility->id;
        $meeting->category_dict_id = (Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValues(byId: true)[PositionAttributeUuidEnum::category->value]);
    }

    private function extract(array &$data, string $key)
    {
        if (!array_key_exists($key, $data)) {
            return [];
        }
        $dataKey = $data[$key];
        unset($data[$key]);
        return $dataKey;
    }

    private function extractStaff(array &$data): array
    {
        $attendants = [];
        foreach ($this->extract($data, 'staff') as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $attendant->attendance_type = AttendanceType::Staff;
            $attendants[$attendant->user_id] = $attendant;
        }
        return array_values($attendants);
    }

    private function extractClients(array &$data): array
    {
        $attendants = [];
        foreach ($this->extract($data, 'clients') as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $attendant->attendance_type = AttendanceType::Client;
            $attendants[$attendant->user_id] = $attendant;
        }
        return array_values($attendants);
    }

    private function extractResources(array &$data): array
    {
        if (!array_key_exists('resources', $data)) {
            return [];
        }
        $resourcesData = $data['resources'] ?? null;
        unset($data['resources']);
        $resources = [];
        foreach ($resourcesData as $resourceData) {
            $resource = new MeetingResource($resourceData);
            $resources[$resource->resource_dict_id] = $resource;
        }
        return array_values($resources);
    }
}
