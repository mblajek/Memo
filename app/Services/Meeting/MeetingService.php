<?php

namespace App\Services\Meeting;

use App\Models\Attribute;
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
        $fromMeeting = $this->handleFromMeetingId($meeting);
        $meeting->facility_id = $facility->id;
        $this->fillMeetingCategory($meeting);

        $staff = $this->extractStaff($data) ?? [];
        $clients = $this->extractClients($data) ?? [];
        $attendants = $staff + $clients;
        $resources = $this->extractResources($data) ?? [];

        DB::transaction(function () use ($meeting, $fromMeeting, $attendants, $resources) {
            $fromMeeting?->save();
            $meeting->save();
            $meeting->attendants()->saveMany($attendants);
            $meeting->resources()->saveMany($resources);
        });

        return $meeting->id;
    }

    public function patch(Meeting $meeting, array $data): void
    {
        $meeting->fill($data);
        if (array_key_exists('type_dict_id', $meeting->getDirty())) {
            $this->fillMeetingCategory($meeting);
            $meeting->from_meeting_id = null;
            $meeting->interval = null;
        }

        $finalAttendants = $this->extractPatchAttendants($data, $meeting);
        $finalResources = $this->extractResources($data);

        DB::transaction(function () use ($meeting, $finalAttendants, $finalResources) {
            if ($meeting->isDirty()) {
                $meeting->save();
            }
            if (!is_null($finalAttendants)) {
                /** @var array<non-falsy-string, MeetingAttendant> $currentAttendants */
                $currentAttendants = $meeting->attendants->keyBy('user_id')->all();
                /** @var array<non-falsy-string, MeetingAttendant> $newAttendants */
                [$userIdsToRemove, $newAttendants] = $finalAttendants;
                $meeting->attendants()->whereIn('user_id', $userIdsToRemove)->delete();
                foreach ($newAttendants as $userId => $newAttendant) {
                    if (array_key_exists($userId, $currentAttendants)) {
                        $currentAttendants[$userId]->update($newAttendant->attributesToArray());
                    } else {
                        $meeting->attendants()->save($newAttendant);
                    }
                }
            }
            if (!is_null($finalResources)) {
                $meeting->resources()->delete();
                if (count($finalResources) > 0) {
                    $meeting->resources()->saveMany($finalResources);
                }
            }
        });
    }

    private function handleFromMeetingId(Meeting $meeting): ?Meeting
    {
        if ($meeting->from_meeting_id) {
            $fromMeeting = Meeting::query()->findOrFail($meeting->from_meeting_id);
            if ($meeting->from_meeting_id !== $fromMeeting->from_meeting_id) {
                if ($fromMeeting->from_meeting_id) {
                    $meeting->from_meeting_id = $fromMeeting->from_meeting_id;
                } else {
                    $fromMeeting->from_meeting_id = $meeting->from_meeting_id;
                    return $fromMeeting;
                }
            }
        }
        return null;
    }

    private function fillMeetingCategory(Meeting $meeting): void
    {
        $meeting->category_dict_id = (Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValues()[Attribute::getById(PositionAttributeUuidEnum::Category)->api_name]);
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

    /** @return ?array<non-falsy-string, MeetingAttendant> */
    private function extractStaff(array &$data): ?array
    {
        $attendants = [];
        $attendantsData = $this->extract($data, 'staff');
        if (is_null($attendantsData)) {
            return null;
        }
        foreach ($attendantsData as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $attendant->attendance_type_dict_id = AttendanceType::Staff->value;
            $attendants[$attendant->user_id] = $attendant;
        }
        return $attendants;
    }

    /** @return ?array<non-falsy-string, MeetingAttendant> */
    private function extractClients(array &$data): ?array
    {
        $attendants = [];
        $attendantsData = $this->extract($data, 'clients');
        if (is_null($attendantsData)) {
            return null;
        }
        foreach ($attendantsData as $attendantData) {
            $attendant = new MeetingAttendant($attendantData);
            $attendant->attendance_type_dict_id = AttendanceType::Client->value;
            $attendants[$attendant->user_id] = $attendant;
        }
        return $attendants;
    }

    /** @return ?array<non-falsy-string, MeetingAttendant> */
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
        return $resources;
    }

    public function extractPatchAttendants(array &$data, Meeting $meeting): ?array
    {
        $newStaff = $this->extractStaff($data);
        $newClients = $this->extractClients($data);

        if (is_null($newStaff) && is_null($newClients)) {
            return null;
        }

        /** @var array<non-falsy-string, MeetingAttendant> $currentStaff */
        $currentStaff = $meeting->getAttendants(AttendanceType::Staff)->keyBy('user_id')->all();
        /** @var array<non-falsy-string, MeetingAttendant> $currentStaff */
        $currentClients = $meeting->getAttendants(AttendanceType::Client)->keyBy('user_id')->all();
        /** @var array<non-falsy-string, MeetingAttendant> $newAttendants */
        $newAttendants = ($newStaff ?? []) + ($newClients ?? []);

        /** @var list<string> $userIdsToRemove */
        $userIdsToRemove = [];
        if ($newStaff !== null) {
            foreach ($currentStaff as $userId => $currentAttendant) {
                if (!array_key_exists($userId, $newAttendants)) {
                    $userIdsToRemove[] = $userId;
                }
            }
        }
        if ($newClients !== null) {
            foreach ($currentClients as $userId => $currentAttendant) {
                if (!array_key_exists($userId, $newAttendants)) {
                    $userIdsToRemove[] = $userId;
                }
            }
        }

        return [$userIdsToRemove, $newAttendants];
    }
}
