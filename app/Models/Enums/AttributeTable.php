<?php

namespace App\Models\Enums;

enum AttributeTable: string
{
    case Attribute = 'attributes';
    case Client = 'clients';
    case Dictionary = 'dictionaries';
    case Facility = 'facilities';
    case Grant = 'grants';
    case Meeting = 'meetings';
    case MeetingAttendant = 'meeting_attendants';
    case MeetingResource = 'meeting_resources';
    case Member = 'members';
    case Position = 'positions';
    case StaffMember = 'staff_members';
    case Timetable = 'timetables';
    case User = 'users';
    case Value = 'Values';
}
