<?php

namespace App\Services\Meeting;

use App\Models\Enums\AttendanceType;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\MeetingResource;
use App\Models\Notification;
use App\Models\Position;
use App\Models\UuidEnum\PositionAttributeUuidEnum;
use App\Notification\Meeting\MeetingNotification;
use App\Notification\Meeting\MeetingNotificationService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

readonly class MeetingService
{
    public function __construct(
        private MeetingNotificationService $meetingNotificationService,
    ) {
    }

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

        ['create' => $meetingNotifications] = $this->extractMeetingNotifications($data, meeting: null);

        DB::transaction(function () use ($meeting, $fromMeeting, $attendants, $resources, $meetingNotifications) {
            $fromMeeting?->save();
            $meeting->save();
            $meeting->attendants()->saveMany($attendants);
            $meeting->resources()->saveMany($resources);

            $meeting->unsetRelations();

            $notifications = $this->meetingNotificationService
                ->create(meeting: $meeting, meetingNotifications: $meetingNotifications);

            $meeting->notifications()->saveMany($notifications);
        });

        return $meeting->id;
    }

    public function patch(Meeting $meeting, array $data): void
    {
        $meeting->fill($data);
        if ($meeting->isDirty(['type_dict_id'])) {
            $this->fillMeetingCategory($meeting);
            $meeting->from_meeting_id = null;
            $meeting->interval = null;
        }

        $finalAttendants = $this->extractPatchAttendants($data, $meeting);
        $finalResources = $this->extractResources($data);

        [
            'create' => $meetingNotificationsToCreate,
            'update' => $notificationsToUpdate,
            'delete' => $notificationsToDelete,
        ] = $this->extractMeetingNotifications($data, $meeting);

        DB::transaction(function () use (
            $meeting,
            $finalAttendants,
            $finalResources,
            $meetingNotificationsToCreate,
            $notificationsToUpdate,
            $notificationsToDelete,
        ) {
            $isDatetimeChange = $meeting->isDirty(['date', 'start_dayminute']);
            $meeting->save();
            if ($finalAttendants !== null) {
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
            if ($finalResources !== null) {
                $meeting->resources()->delete();
                if (count($finalResources) > 0) {
                    $meeting->resources()->saveMany($finalResources);
                }
            }

            $meeting->unsetRelations();

            $updatedNotifications = $this->meetingNotificationService
                ->updateOrDelete($meeting,  Collection::make($notificationsToUpdate), $isDatetimeChange);

            $createdNotifications = $this->meetingNotificationService
                ->create(meeting: $meeting, meetingNotifications: $meetingNotificationsToCreate);

            $meeting->notifications()->saveMany($updatedNotifications);
            $meeting->notifications()->saveMany($createdNotifications);

            if ($notificationsToDelete) {
                Collection::make($notificationsToDelete)->toQuery()->delete();
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
        $meeting->category_dict_id = Position::query()->findOrFail($meeting->type_dict_id)
            ->attrValue(PositionAttributeUuidEnum::Category);
    }

    /**
     * @return array{create: list<MeetingNotification>, unpdate: list<Notification>, delete: list<Notification>}
     */
    private function extractMeetingNotifications($data, ?Meeting $meeting): array
    {
        $newClientsNotifications = $this->extract($data, 'clients');
        if ($newClientsNotifications === null) {
            return ['create' => [], 'update' => $meeting?->notifications->all() ?: [], 'delete' => []];
        }

        /** @var array<non-falsy-string, array<int, MeetingNotification>> $meetingNotifications */
        $meetingNotifications = [];
        foreach ($newClientsNotifications as $newClientData) {
            $newClientNotificationsData = $this->extract($newClientData, 'notifications');
            if ($newClientNotificationsData === null) {
                continue;
            }

            $userId = $newClientData['user_id'];
            $meetingNotifications[$userId] ??= [];
            foreach (($newClientData['notifications'] ?? []) as $notification) {
                $meetingNotifications[$userId][] = new MeetingNotification(
                    userId: $newClientData['user_id'],
                    notificationMethodDictId: NotificationMethod::from($notification['notification_method_dict_id']),
                );
            }
        }

        $notificationsToDelete = [];
        $notificationsToUpdate = [];
        foreach (($meeting?->notifications ?: []) as $oldNotification) {
            $userId = $oldNotification->user_id;
            $oldNotificationMethodDictId = $oldNotification->notification_method_dict_id;

            if (array_key_exists($userId, $meetingNotifications)) {
                $matchedMeetingNotification = null;
                foreach ($meetingNotifications[$userId] as $k => $meetingNotification) {
                    if (
                        $meetingNotification->notificationMethodDictId === $oldNotificationMethodDictId
                    ) {
                        $matchedMeetingNotification = $meetingNotification;
                        unset($meetingNotifications[$userId][$k]);
                    }
                }

                if ($matchedMeetingNotification) {
                    $notificationsToUpdate[] = $oldNotification;
                } else {
                    $notificationsToDelete[] = $oldNotification;
                }
            } else {
                $notificationsToUpdate[] = $oldNotification;
            }
        }

        return [
            'create' => Arr::flatten($meetingNotifications),
            'update' => $notificationsToUpdate,
            'delete' => $notificationsToDelete,
        ];
    }

    private function extract(array $data, string $key)
    {
        return array_key_exists($key, $data) ? ($data[$key] ?: []) : null;
    }

    /** @return ?array<non-falsy-string, MeetingAttendant> */
    private function extractStaff(array $data): ?array
    {
        $attendants = [];
        $attendantsData = $this->extract($data, 'staff');
        if ($attendantsData === null) {
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
    private function extractClients(array $data): ?array
    {
        $attendants = [];
        $attendantsData = $this->extract($data, 'clients');
        if ($attendantsData === null) {
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
    private function extractResources(array $data): ?array
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

    public function extractPatchAttendants(array $data, Meeting $meeting): ?array
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
