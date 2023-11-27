<?php

namespace App\Models\Enums;

enum AttendanceType: string
{
    case Client = 'client';
    case Staff = 'staff';
    case Other = 'other';
}
