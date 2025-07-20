<?php

namespace App\Utils\Date;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use Illuminate\Support\Facades\Config;
use IntlDateFormatter;
use IntlDatePatternGenerator;

class DateHelper
{
    private const string DB_FORMAT = 'Y-m-d H:i:s';
    private const string API_FORMAT = 'Y-m-d\\TH:i:sp';
    private static DateTimeZone $systemTimezone;
    private static DateTimeZone $userTimezone;

    private const string USER_FORMAT_DATETIME_SKELETON = 'yMd eee Hm';
    private const string USER_FORMAT_DATE_SKELETON = 'yMd eee';
    // Should actually be 'jm' if 'j' was properly supported. Same above.
    // https://unicode-org.github.io/icu/userguide/format_parse/datetime/#datetimepatterngenerator
    private const string USER_FORMAT_TIME_SKELETON = 'Hm';

    /**
     * @see IntlDatePatternGenerator::getBestPattern()
     */
    public static function formatBestDateTime(DateTimeImmutable $dateLocale, bool $date, bool $time): string
    {
        $skeleton = match (true) {
            ($date && $time) => self::USER_FORMAT_DATETIME_SKELETON,
            $date => self::USER_FORMAT_DATE_SKELETON,
            $time => self::USER_FORMAT_TIME_SKELETON,
            default => ''
        };
        $locale = Config::string('app.locale');

        return IntlDateFormatter::formatObject(
            datetime: $dateLocale,
            format: IntlDatePatternGenerator::create($locale)->getBestPattern($skeleton),
            locale: $locale,
        );
    }

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
