<?php

namespace App\Notification\Meeting;

use App\Models\Enums\AttendanceType;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Notification;
use App\Notification\NotificationService;
use App\Notification\NotificationStatus;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\ItemNotFoundException;

readonly class MeetingNotificationService
{
    public function __construct(
        private NotificationService $notificationService,
    ) {
    }

    /**
     * @param EloquentCollection<array-key, Notification> $notifications
     * // avoid invalid parameter type invalid inspection - Collection<A,B> is already iterable<A>
     * @return EloquentCollection<array-key, Notification>&iterable<Notification>
     */
    public function updateOrDelete(
        Meeting $meeting,
        EloquentCollection $notifications,
        bool $isDatetimeChange,
    ): EloquentCollection {
        $updatedNotifications = new EloquentCollection();
        $scheduledAt = $this->determineScheduledAt($meeting);

        foreach ($notifications as $notification) {
            $notification->scheduled_at = $scheduledAt;

            $meetingAttendant = $meeting->getAttendant(AttendanceType::Client, $notification->user_id);

            if (!$meetingAttendant) {
                $notification->delete();
                continue;
            }

            $determinedStatus = $this->determineStatus($meeting, $meetingAttendant);

            if ($isDatetimeChange && $notification->status->isInterpolated()) {
                $this->resetMessage($notification, $determinedStatus);
            } elseif ($determinedStatus->isStatusToSend() !== $notification->status->isStatusToSend()) {
                $notification->status = match ($notification->status) {
                    NotificationStatus::skipped, NotificationStatus::scheduled => $determinedStatus,
                    NotificationStatus::error_try1, NotificationStatus::error_try2 => NotificationStatus::error,
                    default => $notification->status, // keep: sent, deduplicated, error, error_address
                };
            }

            $updatedNotifications->add($notification);
        }
        return $updatedNotifications;
    }

    private function resetMessage(Notification $notification, NotificationStatus $status): void
    {
        $notification->status = $status;
        $notification->address = null;
        $notification->service = null;
        $notification->error_log_entry_id = null;

        $notification->subject = NotificationTemplate::meeting_facility_template_subject->templateString();
        if ($notification->message !== null) {
            $notification->message = NotificationTemplate::meeting_facility_template_message->templateString();
        }
    }

    private function determineStatus(
        Meeting $meeting,
        MeetingAttendant $meetingAttendant,
    ): NotificationStatus {
        return (($meeting->status_dict_id === Meeting::STATUS_PLANNED)
            && ($meetingAttendant->attendance_status_dict_id === MeetingAttendant::ATTENDANCE_STATUS_OK))
            ? NotificationStatus::scheduled : NotificationStatus::skipped;
    }

    /**
     * @param list<MeetingNotification> $meetingNotifications
     * // avoid invalid parameter type invalid inspection - Collection<A,B> is already iterable<A>
     * @return EloquentCollection<array-key, Notification>&iterable<Notification>
     */
    public function create(
        Meeting $meeting,
        array $meetingNotifications,
    ): EloquentCollection {
        $notifications = new EloquentCollection();
        foreach ($meetingNotifications as $meetingNotification) {
            $userId = $meetingNotification->userId;
            $meetingAttendant = $meetingNotification->meetingAttendant
                ?: $meeting->getAttendant(AttendanceType::Client, $userId)
                    ?: (throw new ItemNotFoundException());

            $notifications->add(
                $this->notificationService->schedule(
                    facilityId: $meeting->facility,
                    userId: $userId,
                    meetingId: $meeting->id,
                    notificationMethodId: $meetingNotification->notificationMethodDictId,
                    address: null,
                    subject: NotificationTemplate::meeting_facility_template_subject->templateString(),
                    scheduledAt: $this->determineScheduledAt($meeting),
                    message: NotificationTemplate::meeting_facility_template_message->templateString(),
                    status: $this->determineStatus($meeting, $meetingAttendant),
                ),
            );
        }
        return $notifications;
    }

    public function meetingDatetimeLocale(Meeting $meeting): DateTimeImmutable
    {
        /** @noinspection PhpNamedArgumentMightBeUnresolvedInspection */
        return DateTimeImmutable::createFromFormat(
            format: '!Y-m-d',
            datetime: $meeting->date,
            timezone: DateHelper::getUserTimezone(),
        )->setTime(hour: 0, minute: $meeting->start_dayminute);
    }

    public function formatBestDateTime(Meeting $meeting, NotificationTemplate $template): string
    {
        $datetime = $template === NotificationTemplate::meeting_datetime;
        $date = $datetime || $template === NotificationTemplate::meeting_date;
        $time = $datetime || $template === NotificationTemplate::meeting_time;

        return DateHelper::formatBestDateTime($this->meetingDatetimeLocale($meeting), date: $date, time: $time);
    }

    private function determineScheduledAt(Meeting $meeting): DateTimeImmutable
    {
        $dateTimeLocale = $this->meetingDatetimeLocale($meeting);

        $meetingHoursLocale = intval($dateTimeLocale->format('H'));
        $scheduledAtHoursLocale = match (true) {
            ($meetingHoursLocale >= 16) => 16,
            ($meetingHoursLocale >= 14) => 14,
            default => 12,
        };

        /** @noinspection PhpUnhandledExceptionInspection */
        return $dateTimeLocale
            ->modify('-2day')
            ->setTime(hour: $scheduledAtHoursLocale, minute: 0)
            ->setTimezone(new DateTimeZone('UTC'));
    }
}
