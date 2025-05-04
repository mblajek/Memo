<?php

namespace App\Notification\Meeting;

use App\Models\Meeting;
use App\Models\Member;
use App\Models\Notification;
use App\Notification\NotificationService;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Env;
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
    public function updateScheduledAt(
        Meeting $meeting,
        EloquentCollection $notifications,
    ): void {
        $scheduledAt = $this->determineScheduledAt($meeting);

        foreach ($notifications as $notification) {
            $this->notificationService->setScheduledAt($notification, $scheduledAt);
        }
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
        $scheduledAt = $this->determineScheduledAt($meeting);

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
                    scheduledAt: $scheduledAt,
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
            locale: 'PL_pl',
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
