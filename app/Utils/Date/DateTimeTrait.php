<?php

namespace App\Utils\Date;

use DateTimeInterface;

trait DateTimeTrait
{
    protected function serializeDate(DateTimeInterface $date): string
    {
        return DateHelper::toZuluString($date);
    }
}
