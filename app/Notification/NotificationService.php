<?php

namespace App\Notification;

use App\Models\Client;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\Notification;
use App\Models\User;
use App\Models\UuidEnum\ClientAttributeUuidEnum;
use App\Utils\Nullable;
use DateTimeImmutable;

class NotificationService
{
    public function scheduleSms(
        null|Facility|string|true $facilityId,
        string|User|null $userId,
        string|Client|null $clientId,
        string|Meeting|null $meetingId,
        ?string $address,
        string $subject,
        ?DateTimeImmutable $scheduledAt,
    ): void {
        $this->schedule(
            facilityId: $facilityId,
            userId: $userId,
            clientId: $clientId,
            meetingId: $meetingId,
            notificationMethodId: NotificationMethod::Sms,
            address: $address,
            subject: $subject,
            scheduledAt: $scheduledAt,
        );
    }

    public function schedule(
        null|Facility|string|true $facilityId,
        string|User|null $userId,
        string|Client|null $clientId,
        string|Meeting|null $meetingId,
        string|NotificationMethod $notificationMethodId,
        ?string $address,
        string $subject,
        ?string $message = null,
        ?string $messageHtml = null,
        ?DateTimeImmutable $scheduledAt = null,
    ): Notification {
        $warnings = [];

        $notificationMethod = ($notificationMethodId instanceof NotificationMethod)
            ? $notificationMethodId : NotificationMethod::from($notificationMethodId);

        /** @var ?Client $client */
        $client = ($clientId instanceof Client) ? $clientId
            : Nullable::call($clientId, Client::query()->findOrFail(...));

        if ($client) {
            $clientAttributes = $client->attrValues();
            if (!in_array(
                $notificationMethod->value,
                $clientAttributes[ClientAttributeUuidEnum::NotificationMethods->apiName()] ?? [],
                strict: true,
            )) {
                $warnings[]= 'no notification method';
            }
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
            'scheduled_at' => $scheduledAt ?? new DateTimeImmutable(),
            'service' => null,
            'status' => NotificationStatus::scheduled,
            'error_log_entry_id' => null,
        ]);

        $notification->determineAddress();

        print_r($notification);
        die;
    }
}
