<?php

namespace App\Services\Database;

enum DatabaseDumpStatus
{
    public const array CREATE_OK = [self::created, self::restoring, self::restore_error];

    case creating;
    case created;
    case create_error;
    case restoring;
    case restore_error;
}
