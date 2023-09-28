<?php

namespace App\Utils\Date;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

class DateHelper
{
    private const DB_FORMAT = 'Y-m-d H:i:s';
    private static DateTimeZone $utc;

    public static function dbToZuluString($date): string
    {
        if (!isset(self::$utc)) {
            self::$utc = new DateTimeZone('UTC');
        }
        return self::toZuluString(DateTimeImmutable::createFromFormat(self::DB_FORMAT, $date, self::$utc));
    }

    public static function toZuluString(DateTimeInterface $date): string
    {
        if ($date->getOffset() === 0) {
            return $date->format('Y-m-d\TH:i:s\Z');
        }
        throw TimezoneException::fromTimezone($date->getTimezone());
    }
}
