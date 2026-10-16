<?php

namespace Tests\Feature\Notification;

use App\Console\Commands\SendNotificationsCommand;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\LogEntry;
use App\Models\Meeting;
use App\Models\Notification;
use App\Notification\Meeting\MeetingNotificationService;
use App\Notification\Meeting\NotificationTemplate;
use App\Notification\NotificationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\App;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;

class SendNotificationsCommandTest extends TestCase
{
    use DatabaseTransactions;

    private const string LOG_SOURCE = 'notification_template_error';

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
}
