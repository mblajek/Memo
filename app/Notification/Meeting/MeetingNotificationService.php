<?php

namespace App\Notification\Meeting;

use App\Models\Enums\AttendanceType;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\Notification;
use App\Notification\NotificationService;
use App\Notification\NotificationStatus;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Config;
use IntlDateFormatter;

readonly class MeetingNotificationService
{
    public function __construct(
        private NotificationService $notificationService,
    ) {
    }

    /**
     * @param EloquentCollection<array-key, Notification> $notifications
     */
    public function update(
        Meeting $meeting,
        EloquentCollection $notifications,
        bool $isDatetimeChange,
    ): void {
        $scheduledAt = $this->determineScheduledAt($meeting);

        foreach ($notifications as $notification) {
            $notification->scheduled_at = $scheduledAt;
            $notification->status = $this->determineStatus(
                $meeting,
                $isDatetimeChange ? NotificationStatus::scheduled : $notification->status,
                $notification->user_id,
            );
            if ($isDatetimeChange) {
                $notification->subject = Env::getOrFail('TMP_MEETING_NOTIFICATION_SUBJECT');
            }
        }
    }

    private function determineStatus(
        Meeting $meeting,
        NotificationStatus $notificationStatus,
        string $userId,
    ): NotificationStatus {
        if ($notificationStatus->baseStatus() === NotificationStatus::sent) {
            return $notificationStatus;
        }

        return ($meeting->status_dict_id === Meeting::STATUS_PLANNED) && $meeting->attendants->contains(
            fn(MeetingAttendant $meetingAttendant)
                => $meetingAttendant->user_id === $userId
                && $meetingAttendant->attendance_type_dict_id === AttendanceType::Client->value
                && $meetingAttendant->attendance_status_dict_id === MeetingAttendant::ATTENDANCE_STATUS_OK,
        ) ? NotificationStatus::scheduled : NotificationStatus::skipped;
    }

    /**
     * @param Meeting $meeting
     * @param list<MeetingNotification> $meetingNotifications
     * @return EloquentCollection<array-key, Notification>
     */
    public function create(
        Meeting $meeting,
        array $meetingNotifications,
    ): EloquentCollection {
        $notifications = new EloquentCollection();
        foreach ($meetingNotifications as $meetingNotification) {
            $userId = $meetingNotification->userId;
            $notifications->add(
                $this->notificationService->schedule(
                    facilityId: $meeting->facility_id,
                    userId: $userId,
                    clientId: Member::query()->where('user_id', $userId)
                        ->where('facility_id', $meeting->facility_id)
                        ->firstOrFail(['client_id'])->offsetGet('client_id'),
                    meetingId: $meeting->id,
                    notificationMethodId: $meetingNotification->notificationMethodDictId,
                    address: null,
                    subject: Env::getOrFail('TMP_MEETING_NOTIFICATION_SUBJECT'),
                    scheduledAt: $this->determineScheduledAt($meeting),
                    status: $this->determineStatus(
                        $meeting,
                        NotificationStatus::scheduled,
                        $meetingNotification->userId,
                    ),
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

    public function formatDateTimeLocale(Meeting $meeting): string
    {
        return IntlDateFormatter::formatObject(
            datetime: $this->meetingDatetimeLocale($meeting),
            format: IntlDateFormatter::SHORT,
            locale: Config::string('app.locale'),
        );
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
