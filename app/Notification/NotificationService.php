<?php

namespace App\Notification;

use App\Models\Client;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\Notification;
use App\Models\User;
use App\Services\System\LogService;
use App\Utils\Nullable;
use DateTimeImmutable;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Psr\Log\LogLevel;
use Throwable;

readonly class NotificationService
{
    public function __construct(
        private LogService $logService,
    ) {
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
        ?NotificationStatus $status = null,
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

        if ($notificationMethod === NotificationMethod::Sms) {
            $message = null;
        }

        return new Notification([
            'facility_id' => $facility?->id,
            'user_id' => $user?->id,
            'client_id' => $client->id,
            'meeting_id' => $meetingId,
            'notification_method_dict_id' => $notificationMethod,
            'address' => $address,
            'subject' => $subject,
            'message' => $message,
            'message_html' => $messageHtml,
            'scheduled_at' => $scheduledAt ?: (new DateTimeImmutable()),
            'service' => null,
            'status' => $status ?: NotificationStatus::scheduled,
            'error_log_entry_id' => null,
        ]);
    }

    public function send(Notification $notification): int
    {
        /** @var AbstractNotificationSendService $service */
        $service = App::make($notification->notification_method_dict_id->service());
        try {
            $notification->service = $service->sendNotification($notification);
            DB::transaction(function () use ($notification) {
                $notification->status = NotificationStatus::sent;
                $notification->save();
            });
        } catch (Throwable $error) {
            $notification->status = match ($notification->status) {
                NotificationStatus::error_try1 => NotificationStatus::error_try2,
                NotificationStatus::error_try2 => NotificationStatus::error,
                default => NotificationStatus::error_try1,
            };
            if ($notification->status === NotificationStatus::error) {
                $notification->error_log_entry_id = $this->logService->addEntry(
                    request: null,
                    source: 'notification_send_error',
                    logLevel: LogLevel::ERROR,
                    message: $error->getMessage(),
                );
            }
            $notification->save();
        }
        return ($notification->status === NotificationStatus::sent) ? 1 : 0;
    }
}
