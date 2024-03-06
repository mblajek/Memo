<?php

namespace App\Models\Enums;

enum AttributeTable: string
{
    case User = 'users';
    case Client = 'clients';
    case Position = 'positions';
    case Meeting = 'meetings';
    case MeetingAttendant = 'meeting_attendants';
    case MeetingResource = 'meeting_resources';
    case Dictionary = 'dictionaries';
    case Attribute = 'attributes';
}
