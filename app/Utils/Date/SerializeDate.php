<?php

namespace App\Utils\Date;

use DateTimeInterface;

trait SerializeDate
{
    /**
     * Prepare a date for array / JSON serialization.
     */
    protected function serializeDate(DateTimeInterface $date): string
    {
        return DateHelper::toZuluString($date);
    }
}
