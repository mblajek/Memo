<?php

namespace Tests\Feature\Notification;

use App\Console\Commands\SendNotificationsCommand;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Attribute;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\LogEntry;
use App\Models\Meeting;
use App\Models\Notification;
use App\Models\User;
use App\Notification\Meeting\MeetingNotificationService;
use App\Notification\Meeting\NotificationTemplate;
use App\Notification\NotificationService;
use App\Notification\NotificationStatus;
use App\Services\System\LogService;
use ArrayObject;
use DateTimeImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\App;
use ReflectionMethod;
use RuntimeException;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class SendNotificationsCommandTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const string LOG_SOURCE = 'notification_template_error';

    // Seeded fixed "adult" position of the client-type dictionary (the v0.21.0 schema migration).
    private const string CLIENT_TYPE_ADULT = 'd1c57dfc-c118-49ff-ae38-6585645349ca';

    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());
    }

    private static function prepareMessage(Notification $notification): void
    {
        (new ReflectionMethod(SendNotificationsCommand::class, 'prepareMessage'))
            ->invoke(App::make(SendNotificationsCommand::class), $notification);
    }

    private static function countLogEntries(): int
    {
        return LogEntry::query()->where('source', self::LOG_SOURCE)->count();
    }

    public function testIsRemoteWithoutMeetingIsUnknownLikeOtherMeetingPlaceholders(): void
    {
        $logEntriesBefore = self::countLogEntries();
        $notification = new Notification([
            'subject' => NotificationTemplate::meeting_is_remote->templateString(),
            'message' => NotificationTemplate::meeting_date->templateString(),
        ]);

        self::prepareMessage($notification);

        self::assertSame('(?)', $notification->subject);
        self::assertSame('(?)', $notification->message);
        self::assertSame($logEntriesBefore, self::countLogEntries());
    }

    public function testIsRemoteWithMeeting(): void
    {
        $notification = new Notification(['subject' => NotificationTemplate::meeting_is_remote->templateString()]);
        $notification->setRelation('meeting', (new Meeting())->forceFill(['is_remote' => true]));

        self::prepareMessage($notification);

        self::assertSame(trans('notifications.template.is_remote'), $notification->subject);
    }

    public function testFailingPlaceholderIsLogged(): void
    {
        App::instance(
            MeetingNotificationService::class,
            new readonly class (App::make(NotificationService::class)) extends MeetingNotificationService {
                public function formatBestDateTime(Meeting $meeting, NotificationTemplate $template): string
                {
                    throw new RuntimeException('Formatting failed');
                }
            },
        );
        $logEntriesBefore = self::countLogEntries();
        $notification = new Notification(['subject' => NotificationTemplate::meeting_date->templateString()]);
        $notification->setRelation('meeting', new Meeting());

        self::prepareMessage($notification);

        self::assertSame('<?>', $notification->subject);
        self::assertSame($logEntriesBefore + 1, self::countLogEntries());
    }

    private function prepareSmsFacility(): void
    {
        Notification::query()->whereIn('status', NotificationStatus::statusesToSend())
            ->update(['status' => NotificationStatus::skipped->name]);
        Attribute::clearCacheAll();
        $this->facility = Facility::factory()->create(['meeting_notification_template_subject' => 'Reminder']);
        $this->prepareFacilityAdmin($this->facility, user: User::factory()->create());
    }

    private function createClientWithSharedPhone(string $name): string
    {
        $result = $this->post(sprintf('/api/v1/facility/%s/user/client', $this->facility->id), [
            'name' => $name,
            'client' => ['typeDictId' => self::CLIENT_TYPE_ADULT, 'contactPhone' => '+48 600 555 555'],
        ]);
        $result->assertCreated();
        return $result->json('data.id');
    }

    private function scheduleSms(string $userId, string $subject, int $minutesAgo): string
    {
        $notification = App::make(NotificationService::class)->schedule(
            facilityId: $this->facility,
            userId: $userId,
            meetingId: null,
            notificationMethodId: NotificationMethod::Sms,
            address: null,
            subject: $subject,
            scheduledAt: new DateTimeImmutable("-$minutesAgo minutes"),
        );
        $notification->saveOrFail();
        return $notification->id;
    }

    /**
     * Binds a notification service that sends nothing, records the sent subject per attempt and
     * throws on the first attempt for the given notification.
     *
     * @return ArrayObject<int,array{string,string}> attempts as [id, subject]
     */
    private static function bindNotificationServiceFailingOnce(string $failingId): ArrayObject
    {
        $sendAttempts = new ArrayObject();
        App::instance(
            NotificationService::class,
            new readonly class ($sendAttempts, $failingId, App::make(LogService::class)) extends NotificationService {
                public function __construct(
                    private ArrayObject $sendAttempts,
                    private string $failingId,
                    LogService $logService,
                ) {
                    parent::__construct($logService);
                }

                public function send(Notification $notification): int
                {
                    $isFirstAttempt = !in_array(
                        $notification->id,
                        array_column($this->sendAttempts->getArrayCopy(), 0),
                        true,
                    );
                    $this->sendAttempts->append([$notification->id, $notification->subject]);
                    if ($notification->id === $this->failingId && $isFirstAttempt) {
                        throw new RuntimeException('Simulated failure');
                    }
                    $notification->status = NotificationStatus::sent;
                    $notification->saveOrFail();
                    return 1;
                }
            },
        );
        return $sendAttempts;
    }

    /** Runs a batch that fails, and then the next one. */
    private function runFailingBatchAndRetry(): void
    {
        $command = App::make(SendNotificationsCommand::class);
        $this->assertThrows(fn() => $command->handleBatch(), RuntimeException::class);
        $command->handleBatch();
    }

    public function testDeduplicationSurvivesFailureLaterInBatch(): void
    {
        $this->prepareSmsFacility();
        $userId = $this->createClientWithSharedPhone('Test Client');
        $this->prepareAdminUser();
        $reminderId = $this->scheduleSms($userId, 'Reminder', 3);
        $failingId = $this->scheduleSms($userId, 'Other', 2);
        $duplicateId = $this->scheduleSms($userId, 'Reminder', 1);
        $sendAttempts = self::bindNotificationServiceFailingOnce($failingId);

        $this->runFailingBatchAndRetry();

        self::assertSame([$reminderId, $failingId, $failingId], array_column($sendAttempts->getArrayCopy(), 0));
        self::assertSame(
            NotificationStatus::deduplicated,
            Notification::query()->findOrFail($duplicateId)->status,
        );
    }

    public function testFailureBeforeDeduplicatedGroupKeepsAllRecipientNames(): void
    {
        $this->prepareSmsFacility();
        $annaId = $this->createClientWithSharedPhone('Anna Test');
        $janId = $this->createClientWithSharedPhone('Jan Test');
        $this->prepareAdminUser();
        $subject = NotificationTemplate::recipient_names->templateString();
        $failingId = $this->scheduleSms($annaId, 'Other', 3);
        $reminderId = $this->scheduleSms($annaId, $subject, 2);
        $this->scheduleSms($janId, $subject, 1);
        $sendAttempts = self::bindNotificationServiceFailingOnce($failingId);

        $this->runFailingBatchAndRetry();

        self::assertSame(
            [[$failingId, 'Other'], [$failingId, 'Other'], [$reminderId, 'Anna, Jan']],
            $sendAttempts->getArrayCopy(),
        );
    }
}
