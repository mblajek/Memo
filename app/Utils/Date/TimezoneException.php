<?php

namespace App\Utils\Date;

use DateTimeZone;
use RuntimeException;

class TimezoneException extends RuntimeException
{
    public static function fromTimezone(DateTimeZone $timeZone): static
    {
        return new static('Timezone ' . $timeZone->getName() . ' is not UTC');
    }
}
