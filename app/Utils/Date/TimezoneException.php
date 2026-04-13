<?php

namespace App\Utils\Date;

use DateTimeZone;
use RuntimeException;

final class TimezoneException extends RuntimeException
{
    public static function fromTimezone(DateTimeZone $timeZone): static
    {
        return new self('Timezone ' . $timeZone->getName() . ' is not UTC');
    }
}
