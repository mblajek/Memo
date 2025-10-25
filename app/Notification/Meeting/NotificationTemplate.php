<?php

namespace App\Notification\Meeting;

enum NotificationTemplate
{
    // outer (must be declared before inner)
    case meeting_facility_template_subject;
    case meeting_facility_template_message;

    // inner
    case recipient_names;
    case meeting_datetime;
    case meeting_date;
    case meeting_time;
    case meeting_is_remote;
    case facility_name;
    case facility_contact_phone;

    public function templateString(): string
    {
        return '{{' . $this->name . '}}';
    }

    public static function containsTemplateChars(string $value): string
    {
        return str_contains($value, '{{') || str_contains($value, '}}');
    }

    public function isOuterTemplate(): bool
    {
        return match ($this) {
            self::meeting_facility_template_subject,
            self::meeting_facility_template_message => true,
            default => false,
        };
    }
}
