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

    public function patch(Meeting $meeting, array $data): void
    {
        $meeting->fill($data);

        $newStaff = $this->extractStaff($data);
        $newClients = $this->extractClients($data);

        $currentStaff = $meeting->getAttendants(AttendanceType::Staff);
        $currentClients = $meeting->getAttendants(AttendanceType::Client);

        $finalStaff = empty($newStaff) ? $currentStaff : $newStaff;
        $finalClients = empty($newClients) ? $currentClients : $newClients;

        $finalAttendants = !empty($newStaff) || !empty($newClients) ? array_merge($finalStaff, $finalClients) : null;

        // Resources is the only array that can be set to empty, so we need to distinguish that with null.
        $finalResources = $this->extractResources($data, valueWhenAbsent: null);

        DB::transaction(function () use ($meeting, $finalAttendants, $finalResources) {
            if ($meeting->isDirty()) {
                Log::info(var_export($meeting->getDirty(), true));
                $meeting->save();
            }
            // We could go through those one by one and decide which to remove and which to update etc., but this one is
            // easier and less error prone (as those arrays work with put semantics anyway) - with the expected number
            // of attendants and resources just checking whether any modification has been made, should be enough.
            if (!is_null($finalAttendants)) {
                $meeting->attendants()->delete();
                $meeting->attendants()->saveMany($finalAttendants);
            }
            if (!is_null($finalResources)) {
                $meeting->resources()->delete();
                if (!empty($finalResources)) {
                    $meeting->resources()->saveMany($finalResources);
                }
            }
        });
    }

    private function fillMeeting(Meeting $meeting, Facility $facility): void
    {
        $meeting->facility_id = $facility->id;
        $meeting->category_dict_id = (Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValues(byId: true)[PositionAttributeUuidEnum::Category->value]);
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

    private function extractResources(array &$data, ?array $valueWhenAbsent = []): ?array
    {
        if (!array_key_exists('resources', $data)) {
            return $valueWhenAbsent;
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
