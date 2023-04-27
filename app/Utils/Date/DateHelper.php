<?php

namespace App\Utils\Date;

use DateTimeInterface;

class DateHelper
{
    public static function toZuluString(DateTimeInterface $date): string
    {
        if ($date->getOffset() === 0) {
            return $date->format('Y-m-d\TH:i:s\Z');
        }
        throw TimezoneException::fromTimezone($date->getTimezone());
    }
}
