<?php

namespace App\Models\Enums;

use App\Models\UuidEnum\DictionaryUuidEnum;

enum AttendanceType: string implements PositionsEnum
{
    public static function dictEnum(): DictionaryUuidEnum
    {
        return DictionaryUuidEnum::AttendanceType;
    }

    case Client = 'e2d3c06c-ea2d-4808-adca-6be2c1ea23c2';
    case Staff = '6e1bad86-8b69-43ac-81c1-82f564f2ffb8';
}
