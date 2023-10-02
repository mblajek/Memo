<?php

namespace App\Tquery\Request;

enum TqRequestColumnTypeEnum
{
    case column;

    public static function fromName(string $name): self
    {
        return constant("self::$name");
    }
}
