<?php

namespace App\Services\Meeting;

use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\MeetingResource;
use App\Models\Notification;
use App\Notification\Meeting\MeetingNotificationService;
use Illuminate\Support\Facades\DB;

readonly class MeetingCloneService
{
    public function __construct(
        private MeetingNotificationService $meetingNotificationService,
    ) {
    }

    /**
     * @return list<non-falsy-string>
     */
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
        $resources = $meeting->resources
            ->map(fn(MeetingResource $resource): MeetingResource => $resource->withoutRelations());

        $notifications = $meeting->notifications->map(function (Notification $notification): Notification {
            $notificationCopy = $notification->withoutRelations();
            $notificationCopy->resetStatus();
            return $notificationCopy;
        });

        return DB::transaction(
            function () use ($meeting, $dates, $meetingWithoutRelations, $attendants, $resources, $notifications) {
                $ids = [];
                $meeting->save();
                foreach ($dates as $date) {
                    $meetingCopy = $meetingWithoutRelations->replicate();
                    $meetingCopy->date = $date;
                    $meetingCopy->save();

                    $meetingCopy->attendants()->saveMany($attendants->map(fn($attendant) => $attendant->replicate()));
                    $meetingCopy->resources()->saveMany($resources->map(fn($resource) => $resource->replicate()));

                    $notificationsCopy = $notifications->map(fn($notification) => $notification->replicate());
                    $this->meetingNotificationService->updateOrDelete(
                        $meetingCopy,
                        $notificationsCopy,
                        isDatetimeChange: true,
                    );
                    $meetingCopy->notifications()->saveMany($notificationsCopy);

                    $ids[] = $meetingCopy->id;
                }
                return $ids;
            },
        );
    }
}
