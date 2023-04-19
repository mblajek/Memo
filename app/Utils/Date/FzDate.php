<?php

namespace App\Utils\Date;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

/**
 * @method static static createFromInterface(DateTimeInterface $object) static
 */
class FzDate extends DateTimeImmutable
{
    private const FORMAT_DB = 'Y-m-d H:i:s';

    /*
     * todo: add
     * ::fromZulu: accepting RFC3339 and RFC3339_EXTENDED, throw if not UTC
     * ::fromDbString: from "Y-m-d H:i:s", create as UTC
     * toDbString: return "Y-m-d H:i:s", throw if not UTC
     *
     * method annotations
     */

    public function __construct()
    {
        parent::__construct('now', new DateTimeZone('UTC'));
    }

    public function isZulu(): bool
    {
        return $this->getTimezone()->getName() === 'UTC';
    }

    public function formatZulu(): string
    {
        if (!$this->isZulu()) {
            throw FzTimezoneException::fromTimezone($this->getTimezone());
        }
        return $this->format('Y-m-d\TH:i:s\Z');
    }
}
