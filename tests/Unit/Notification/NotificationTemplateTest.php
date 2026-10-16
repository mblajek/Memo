<?php

namespace Tests\Unit\Notification;

use App\Notification\Meeting\NotificationTemplate;
use PHPUnit\Framework\TestCase;

class NotificationTemplateTest extends TestCase
{
    public function testContainsTemplateChars(): void
    {
        self::assertTrue(NotificationTemplate::containsTemplateChars('Hello {{name'));
        self::assertTrue(NotificationTemplate::containsTemplateChars('Hello name}}'));
        self::assertFalse(NotificationTemplate::containsTemplateChars('Hello {name}'));
        self::assertFalse(NotificationTemplate::containsTemplateChars(''));
    }
}
