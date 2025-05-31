<?php

namespace App\Notification\Meeting;

enum NotificationTemplate
{
    case names;
    case datetime;
    case facility_name;

    public function templateString(): string
    {
        return '{{' . $this->name . '}}';
    }

    public static function containsTemplateChars(string $value): string
    {
        return str_contains($value, '{{') || str_contains($value, '}}');
    }
}
