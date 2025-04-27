<?php

namespace App\Notification;

use App\Models\Client;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\Notification;
use App\Models\User;
use App\Utils\Nullable;
use DateTimeImmutable;

class NotificationService
{
    public function setScheduledAt(
        Notification $notification,
        ?DateTimeImmutable $scheduledAt,
    ): void {
        $status = $notification->status ?? NotificationStatus::scheduled;
        $now = new DateTimeImmutable();
        if (!$scheduledAt) {
            $scheduledAt = $now;
        } /** @noinspection PhpUnhandledExceptionInspection */ elseif (
            $status->isScheduled()
            && ($scheduledAt->modify('+1day') < $now)
        ) {
            $status = NotificationStatus::skipped;
        }
        $notification->status = $status;
        $notification->scheduled_at = $scheduledAt;
    }

    public function schedule(
        null|Facility|string|true $facilityId,
        string|User|null $userId,
        string|Client|null $clientId,
        string|Meeting|null $meetingId,
        string|NotificationMethod $notificationMethodId,
        ?string $address,
        string $subject,
        ?DateTimeImmutable $scheduledAt,
        ?string $message = null,
        ?string $messageHtml = null,
    ): Notification {
        $notificationMethod = ($notificationMethodId instanceof NotificationMethod)
            ? $notificationMethodId : NotificationMethod::from($notificationMethodId);

        /** @var ?Client $client */
        $client = ($clientId instanceof Client) ? $clientId
            : Nullable::call($clientId, Client::query()->findOrFail(...));

        if ($client) {
            $member = $client->member;
            $facilityId ??= $member->facility;
            $userId ??= $member->user;
        }

        /** @var ?Facility $facility */
        $facility = ($facilityId instanceof Facility) ? $facilityId
            : Nullable::call($facilityId, Facility::query()->findOrFail(...));

        /** @var User $user */
        $user = ($userId instanceof User) ? $userId
            : Nullable::call($userId, User::query()->findOrFail(...));

        $notification = new Notification([
            'facility_id' => $facility?->id,
            'user_id' => $user?->id,
            'client_id' => $client->id,
            'meeting_id' => $meetingId,
            'notification_method_dict_id' => $notificationMethod,
            'address' => $address,
            'subject' => $subject,
            'message' => $message,
            'message_html' => $messageHtml,
            'scheduled_at' => null, // overridden in self::setScheduledAt()
            'service' => null,
            'status' => null, // overridden in self::setScheduledAt()
            'error_log_entry_id' => null,
        ]);

        $this->setScheduledAt($notification, $scheduledAt);

        return $notification;
    }
}
