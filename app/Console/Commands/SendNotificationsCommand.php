<?php

namespace App\Console\Commands;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Enums\NotificationMethod;
use App\Models\Notification;
use App\Models\UuidEnum\ClientAttributeUuidEnum;
use App\Notification\Meeting\MeetingNotificationService;
use App\Notification\Meeting\NotificationTemplate;
use App\Notification\NotificationService;
use App\Notification\NotificationStatus;
use DateTimeImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Throwable;

class SendNotificationsCommand extends Command
{
    public const string SIGNATURE = 'fz:send-notifications';

    protected $signature = self::SIGNATURE;
    protected $description = 'Send notifications';

    // increase when retry after fail will be delayed
    private const int BATCH_COUNT = 1;

    private const array STATUS_TO_SEND = [
        NotificationStatus::scheduled,
        NotificationStatus::error_try1,
        NotificationStatus::error_try2,
    ];

    public function __construct(
        private readonly MeetingNotificationService $meetingNotificationService,
        private readonly NotificationService $notificationService,
    ) {
        parent::__construct();
    }

    public function handle(): void
    {
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());

        $sentCount = 0;
        for ($i = 0; $i < self::BATCH_COUNT; $i++) {
            $batchSentCount = $this->handleBatch();
            if ($batchSentCount === null) {
                break;
            }
            $sentCount += $batchSentCount;
        };

        $this->line("Sent $sentCount notifications");
    }

    public function handleBatch(): ?int
    {
        $now = new DateTimeImmutable();

        $baseQuery = Notification::query()->whereIn('status', self::STATUS_TO_SEND)
            ->where('scheduled_at', '<=', $now)->orderBy('scheduled_at');

        /** @var ?Notification $firstNotification */
        $firstNotification = $baseQuery->clone()->first();
        if (!$firstNotification) {
            return null;
        }

        // scheduled,error_try1,error_try2
        $notificationsToSend = $firstNotification->meeting_id
            ? $baseQuery->clone()->where('meeting_id', $firstNotification->meeting_id)->get()
            : $baseQuery->clone()->whereNull('meeting_id')->limit(25)->get();

        // scheduled,error_try1,error_try2 + skipped
        foreach ($notificationsToSend as $notificationToSend) {
            if (
                $notificationToSend->facility?->hasMeetingNotification() === false
                || $notificationToSend->scheduled_at < $now->modify('-2hour')
            ) {
                $notificationToSend->status = NotificationStatus::skipped;
            }
        }

        // scheduled,error_try1,error_try2 / skipped + error_address
        foreach ($notificationsToSend as $notificationToSend) {
            if ($notificationToSend->status === NotificationStatus::scheduled) {
                $this->fillAddress($notificationToSend);
            }
        }

        // scheduled,error_try1,error_try2 / skipped,error_address + deduplicated
        foreach ($notificationsToSend as $preparedNotification) {
            if ($preparedNotification->status !== NotificationStatus::scheduled) {
                continue;
            }
            foreach ($notificationsToSend as $otherToDeduplicate) {
                if (
                    $otherToDeduplicate->id !== $preparedNotification->id
                    && $otherToDeduplicate->status === NotificationStatus::scheduled
                    && $otherToDeduplicate->address === $preparedNotification->address
                    && $otherToDeduplicate->subject === $preparedNotification->subject
                    && $otherToDeduplicate->message === $preparedNotification->message
                    && $otherToDeduplicate->message_html === $preparedNotification->message_html
                ) {
                    $otherToDeduplicate->status = NotificationStatus::deduplicated;
                    $preparedNotification->addDeduplicated($otherToDeduplicate);
                }
            }
            $this->prepareMessage($preparedNotification);
        }

        // scheduled,error_try1,error_try2 / skipped,error_address,deduplicated + sent,error
        $sentCount = 0;
        foreach ($notificationsToSend as $notificationToSend) {
            if (in_array($notificationToSend->status, self::STATUS_TO_SEND)) {
                $sentCount += $this->notificationService->send($notificationToSend);
            } else {
                $notificationToSend->save();
            }
        }
        return $sentCount;
    }

    private function fillAddress(Notification $notification): void
    {
        $address = null;
        if ($notification->notification_method_dict_id === NotificationMethod::Sms) {
            $client = $notification->client;
            if ($client) {
                $address = $client->attrValue(ClientAttributeUuidEnum::ContactPhone);
            }
        }

        if ($address === null) {
            $notification->status = NotificationStatus::error_address;
        } else {
            $notification->address = $address;
        }
    }

    private function prepareMessage(Notification $preparedNotification): void
    {
        $strings = [
            $preparedNotification->subject,
            $preparedNotification->message,
            $preparedNotification->message_html,
        ];
        foreach (NotificationTemplate::cases() as $template) {
            $templateString = $template->templateString();
            $contains = false;
            foreach ($strings as $string) {
                if (is_string($string) && str_contains($string, $templateString)) {
                    $contains = true;
                    break;
                }
            }
            if (!$contains) {
                continue;
            }

            $replacement = $this->getReplacement($template, $preparedNotification);

            foreach ($strings as $key => $string) {
                if (is_string($string)) {
                    $strings[$key] = str_replace($templateString, $replacement, $string);
                }
            }
        }
        /** @var Notification $notification */
        foreach ([$preparedNotification, ...$preparedNotification->getDeduplicated()] as $notification) {
            [$notification->subject, $notification->message, $notification->message_html] = $strings;
        };
    }

    private function getReplacement(
        NotificationTemplate $template,
        Notification $preparedNotification,
    ): string {
        $getReplacement = match ($template) {
            NotificationTemplate::meeting_facility_template_subject => function () use ($preparedNotification) {
                return $preparedNotification->facility?->meeting_notification_template_subject;
            },
            NotificationTemplate::meeting_facility_template_message => function () use ($preparedNotification) {
                return $preparedNotification->facility?->meeting_notification_template_message;
            },
            NotificationTemplate::meeting_datetime => function () use ($preparedNotification) {
                return $preparedNotification->meeting
                    ? $this->meetingNotificationService->formatDateTimeLocale($preparedNotification->meeting)
                    : null;
            },
            NotificationTemplate::meeting_date => function () use ($preparedNotification) {
                return $preparedNotification->meeting
                    ? $this->meetingNotificationService->formatBestDate($preparedNotification->meeting)
                    : null;
            },
            NotificationTemplate::meeting_time => function () use ($preparedNotification) {
                return $preparedNotification->meeting
                    ? $this->meetingNotificationService->formatBestTime($preparedNotification->meeting)
                    : null;
            },
            NotificationTemplate::user_names => function () use ($preparedNotification) {
                $names = [];
                /** @var Notification $notification */
                foreach ([$preparedNotification, ...$preparedNotification->getDeduplicated()] as $notification) {
                    $name = Str::words($notification->user?->name ?? '', 1, '');
                    if ($name !== '') {
                        $names[] = $name;
                    }
                }
                return $names ? implode(', ', $names) : null;
            },
            NotificationTemplate::facility_name => function () use ($preparedNotification) {
                return $preparedNotification->facility?->name;
            },
            NotificationTemplate::facility_contact_phone => function () use ($preparedNotification) {
                return $preparedNotification->facility?->contact_phone;
            },
        };
        try {
            $replacement = $getReplacement() ?? '(?)';
        } catch (Throwable) {
            $replacement = '<?>';
        }

        return $replacement;
    }
}
