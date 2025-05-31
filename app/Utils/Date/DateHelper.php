<?php

namespace App\Utils\Date;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use Illuminate\Support\Facades\Config;

class DateHelper
{
    private const string DB_FORMAT = 'Y-m-d H:i:s';
    private const string API_FORMAT = 'Y-m-d\\TH:i:sp';
    private static DateTimeZone $systemTimezone;
    private static DateTimeZone $userTimezone;

    public static function getSystemTimezone(): DateTimeZone
    {
        /** @noinspection PhpUnhandledExceptionInspection */
        return (self::$systemTimezone ??= new DateTimeZone(Config::string('app.timezone')));
    }

    public static function getUserTimezone(): DateTimeZone
    {
        /** @noinspection PhpUnhandledExceptionInspection */
        return (self::$userTimezone ??= new DateTimeZone(Config::string('app.user_timezone')));
    }

    public static function dbToZuluString(string $date): string
    {
        return self::toZuluString(
            DateTimeImmutable::createFromFormat(self::DB_FORMAT, $date, self::getSystemTimezone()),
        );
    }

    public static function zuluToDbString(string $date): string
    {
        return self::toDbString(DateTimeImmutable::createFromFormat(self::API_FORMAT, $date));
    }

    public static function toZuluString(DateTimeInterface $date): string
    {
        if ($date->getOffset() === 0) {
            return $date->format(self::API_FORMAT);
        }
        throw TimezoneException::fromTimezone($date->getTimezone());
    }

    public static function toDbString(DateTimeInterface $date): string
    {
        if ($date->getOffset() === 0) {
            return $date->format(self::DB_FORMAT);
        }
        throw TimezoneException::fromTimezone($date->getTimezone());
    }
}
